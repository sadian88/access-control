import asyncio

import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEngine:
    """
    Wrapper singleton sobre InsightFace.
    Carga el modelo buffalo_l una sola vez al arrancar el servidor.
    """

    def __init__(self):
        self._app: FaceAnalysis | None = None
        # InsightFace/ONNX no son seguros ante llamadas concurrentes: una inferencia a la vez.
        self._infer_lock = asyncio.Lock()

    def load(self, model_name: str = "buffalo_l") -> None:
        """Descarga (si no existe) y carga el modelo. Llamar en el lifespan."""
        self._app = FaceAnalysis(
            name=model_name,
            providers=["CPUExecutionProvider"],
        )
        # det_size=(640,640) es el tamaño estándar recomendado
        self._app.prepare(ctx_id=0, det_size=(640, 640))

    def detect_and_embed(self, image_bytes: bytes) -> np.ndarray | None:
        """
        Recibe bytes de imagen (JPEG/PNG), detecta el rostro más prominente
        y retorna su embedding 512d. Retorna None si no hay rostro.
        """
        if self._app is None:
            raise RuntimeError("FaceEngine no inicializado. Llamar a load() primero.")

        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return None

        faces = self._app.get(img)
        if not faces:
            return None

        # Seleccionar el rostro más grande (más cercano a la cámara)
        largest = max(
            faces,
            key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        )
        return largest.embedding

    async def detect_and_embed_async(self, image_bytes: bytes) -> np.ndarray | None:
        """
        Igual que detect_and_embed pero en un hilo de trabajo para no bloquear el event loop
        (evita timeouts HTTP/WS y mezclas raras con asyncpg mientras corre el modelo).
        """
        async with self._infer_lock:
            return await asyncio.to_thread(self.detect_and_embed, image_bytes)

    def analyze_liveness(self, image_bytes: bytes) -> dict:
        """
        Análisis simple de liveness sin almacenar frames.
        Retorna dict con: is_live, reasons
        """
        if self._app is None:
            return {"is_live": True, "reasons": ["Engine not loaded"]}

        try:
            arr = np.frombuffer(image_bytes, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                return {"is_live": True, "reasons": ["No image"]}

            faces = self._app.get(img)
            if not faces:
                return {"is_live": True, "reasons": ["No face"]}

            largest = faces[0]
            bbox = largest.bbox
            det_score = largest.det_score
            
            reasons = []
            img_h, img_w = img.shape[:2]
            face_w = bbox[2] - bbox[0]
            face_h = bbox[3] - bbox[1]
            face_ratio = (face_w * face_h) / (img_w * img_h)

            # Verificar tamaño de cara (muy pequeña = muy lejos o foto pequeña)
            if face_ratio < 0.015:
                reasons.append("Face too small")
            
            # Verificar puntuación de detección (muy bajo = sospechoso)
            if det_score < 0.3:
                reasons.append(f"Low det_score: {det_score:.2f}")

            # Análisis de textura - solo para detectar fotos de pantalla obvias
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            x1, y1, x2, y2 = map(int, bbox)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(img_w, x2), min(img_h, y2)
            
            laplacian_var = 0
            if x2 > x1 and y2 > y1:
                face_region = gray[y1:y2, x1:x2]
                laplacian_var = cv2.Laplacian(face_region, cv2.CV_64F).var()
                
                # Solo marcar como no vivo si es muy extremo (pantalla con moiré)
                if laplacian_var < 20:
                    reasons.append(f"Very low texture: {laplacian_var:.1f}")
                elif laplacian_var > 5000:
                    reasons.append(f"Very high texture: {laplacian_var:.1f}")

            # Solo fallar si hay 2+ razones claras
            is_live = len(reasons) < 2
            
            return {
                "is_live": is_live,
                "reasons": reasons,
                "det_score": float(det_score),
                "face_ratio": float(face_ratio),
                "laplacian_var": float(laplacian_var)
            }

        except Exception as e:
            return {"is_live": True, "reasons": [str(e)]}


# Singleton global
face_engine = FaceEngine()
