"""
Anti-spoofing basado en MiniFASNetV2 (Silent-Face-Anti-Spoofing).
Detecta si la cara detectada es una persona real o un ataque
(foto impresa, pantalla de teléfono, retrato).

Referencia: https://github.com/minivision-ai/Silent-Face-Anti-Spoofing
Licencia original: MIT
"""

import cv2
import numpy as np
import torch
import torch.nn as nn


# ── Arquitectura MiniFASNetV2 ────────────────────────────────

class _ConvBlock(nn.Module):
    def __init__(self, in_c, out_c, kernel=(1, 1), stride=(1, 1), padding=(0, 0), groups=1):
        super().__init__()
        self.conv  = nn.Conv2d(in_c, out_c, kernel, stride, padding, groups=groups, bias=False)
        self.bn    = nn.BatchNorm2d(out_c)
        self.prelu = nn.PReLU(out_c)

    def forward(self, x):
        return self.prelu(self.bn(self.conv(x)))


class _LinearBlock(nn.Module):
    def __init__(self, in_c, out_c, kernel=(1, 1), stride=(1, 1), padding=(0, 0), groups=1):
        super().__init__()
        self.conv = nn.Conv2d(in_c, out_c, kernel, stride, padding, groups=groups, bias=False)
        self.bn   = nn.BatchNorm2d(out_c)

    def forward(self, x):
        return self.bn(self.conv(x))


class _DepthWise(nn.Module):
    def __init__(self, c_in, c_out, residual=False, kernel=(3, 3), stride=(2, 2), padding=(1, 1), groups=1):
        super().__init__()
        self.conv     = _ConvBlock(c_in, c_in, kernel=(1, 1))
        self.conv_dw  = _ConvBlock(c_in, c_in, kernel, stride, padding, groups=c_in)
        self.project  = _LinearBlock(c_in, c_out, kernel=(1, 1))
        self.residual = residual

    def forward(self, x):
        shortcut = x
        x = self.conv(x)
        x = self.conv_dw(x)
        x = self.project(x)
        return x + shortcut if self.residual else x


class _Residual(nn.Module):
    def __init__(self, c, num_block, groups, kernel=(3, 3), stride=(1, 1), padding=(1, 1)):
        super().__init__()
        self.model = nn.Sequential(*[
            _DepthWise(c, c, residual=True, kernel=kernel, stride=stride, padding=padding, groups=groups)
            for _ in range(num_block)
        ])

    def forward(self, x):
        return self.model(x)


class _MiniFASNetV2(nn.Module):
    def __init__(self, embedding_size: int = 128, conv6_kernel=(5, 5), num_classes: int = 3):
        super().__init__()
        self.conv1      = _ConvBlock(3, 64, kernel=(3, 3), stride=(2, 2), padding=(1, 1))
        self.conv2_dw   = _ConvBlock(64, 64, kernel=(3, 3), stride=(1, 1), padding=(1, 1), groups=64)
        self.conv_23    = _DepthWise(64, 64, kernel=(3, 3), stride=(2, 2), padding=(1, 1), groups=128)
        self.conv_3     = _Residual(64, num_block=4, groups=128)
        self.conv_34    = _DepthWise(64, 128, kernel=(3, 3), stride=(2, 2), padding=(1, 1), groups=256)
        self.conv_4     = _Residual(128, num_block=6, groups=256)
        self.conv_45    = _DepthWise(128, 128, kernel=(3, 3), stride=(2, 2), padding=(1, 1), groups=512)
        self.conv_5     = _Residual(128, num_block=2, groups=256)
        self.conv_6_sep = _ConvBlock(128, 512, kernel=(1, 1))
        self.conv_6_dw  = _LinearBlock(512, 512, kernel=conv6_kernel, groups=512)
        self.flatten    = nn.Flatten()
        self.linear     = nn.Linear(512, embedding_size)
        self.bn         = nn.BatchNorm1d(embedding_size)
        self.drop       = nn.Dropout(0.0)
        self.prob       = nn.Linear(embedding_size, num_classes)

    def forward(self, x):
        x = self.conv1(x);      x = self.conv2_dw(x)
        x = self.conv_23(x);    x = self.conv_3(x)
        x = self.conv_34(x);    x = self.conv_4(x)
        x = self.conv_45(x);    x = self.conv_5(x)
        x = self.conv_6_sep(x); x = self.conv_6_dw(x)
        x = self.flatten(x);    x = self.linear(x)
        x = self.bn(x);         x = self.drop(x)
        return self.prob(x)


# ── Wrapper público ──────────────────────────────────────────

class AntiSpoofing:
    """
    Verifica si la cara detectada pertenece a una persona real.
    Usa MiniFASNetV2 con scale=2.7 (parámetro del modelo entrenado).

    Clases del modelo:
        0 → spoof (foto / pantalla)
        1 → real  (persona viva)
        2 → spoof alternativo
    """

    _SCALE      = 2.7   # factor de expansión del recorte (coincide con el nombre del .pth)
    _INPUT_SIZE = (80, 80)

    def __init__(self):
        self._model: _MiniFASNetV2 | None = None
        self.threshold: float = 0.6

    def load(self, model_path: str, threshold: float = 0.6) -> None:
        self.threshold = threshold
        model = _MiniFASNetV2(conv6_kernel=(5, 5))
        state = torch.load(model_path, map_location="cpu", weights_only=True)
        model.load_state_dict(state)
        model.eval()
        self._model = model

    def _crop(self, image: np.ndarray, bbox) -> np.ndarray:
        """Recorta la cara con contexto usando el scale factor del modelo."""
        h_img, w_img = image.shape[:2]
        x1, y1, x2, y2 = (int(v) for v in bbox)
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        size = int(max(x2 - x1, y2 - y1) * self._SCALE / 2)
        lx = max(0, cx - size);  rx = min(w_img, cx + size)
        ty = max(0, cy - size);  by = min(h_img, cy + size)
        return image[ty:by, lx:rx]

    def is_real(self, image: np.ndarray, bbox) -> tuple[bool, float]:
        """
        Retorna (es_real, score).
        es_real=True  → persona viva, continuar con identificación.
        es_real=False → ataque detectado, rechazar frame.
        """
        if self._model is None:
            # Si no hay modelo cargado, dejar pasar (fail-open)
            return True, 1.0

        face = self._crop(image, bbox)
        if face.size == 0:
            return False, 0.0

        face = cv2.resize(face, self._INPUT_SIZE)
        face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
        tensor = torch.from_numpy(
            face.transpose(2, 0, 1).astype(np.float32) / 255.0
        ).unsqueeze(0)

        with torch.no_grad():
            probs = torch.softmax(self._model(tensor), dim=1)

        score = probs[0, 1].item()   # probabilidad de ser real (clase 1)
        return score >= self.threshold, score


# Singleton global
anti_spoof = AntiSpoofing()
