"""
Script de enrollment de personas (cliente, visitante o empleado).

Comandos:
  Registrar:        python enroll.py add --name "Juan Pérez" --photo foto.jpg --apartment "401"
  Actualizar foto:  python enroll.py update --cedula "123456" --photo nueva_foto.jpg
  Eliminar:         python enroll.py delete --cedula "123456"
  Listar:           python enroll.py list
"""

import argparse
import asyncio
import os
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy import text

load_dotenv()
POSTGRES_URL = os.environ["POSTGRES_URL"]


def _load_model():
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def _extract_embedding(app, photo: str) -> list:
    import cv2
    path = Path(photo)
    if not path.exists():
        print(f"[ERROR] No se encontró la foto: {path}")
        sys.exit(1)
    image = cv2.imread(str(path))
    if image is None:
        print(f"[ERROR] No se pudo leer la imagen: {path}")
        sys.exit(1)
    faces = app.get(image)
    if not faces:
        print("[ERROR] No se detectó ningún rostro. Usá una foto con el rostro visible y bien iluminado.")
        sys.exit(1)
    if len(faces) > 1:
        print(f"[AVISO] Se detectaron {len(faces)} rostros. Se usará el más prominente.")
    largest = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return largest.embedding.tolist()


def _embedding_str(embedding: list) -> str:
    return "[" + ",".join(str(x) for x in embedding) + "]"


# ── COMANDOS ────────────────────────────────────────────────

async def cmd_add(args):
    print("Cargando modelo InsightFace...")
    app = _load_model()
    embedding = _extract_embedding(app, args.photo)
    print(f"Embedding extraído ({len(embedding)}d).")

    engine = create_async_engine(POSTGRES_URL, echo=False)
    async with async_sessionmaker(engine, expire_on_commit=False)() as db:
        if args.cedula:
            row = (await db.execute(text("SELECT id FROM people WHERE cedula = :c"), {"c": args.cedula})).first()
            if row:
                print(f"[ERROR] Ya existe una persona con cédula {args.cedula}. Usá 'update' para actualizar.")
                await engine.dispose(); sys.exit(1)

        person_id = uuid.uuid4()
        await db.execute(
            text("""
                INSERT INTO people (id, full_name, cedula, email, phone, apartment, embedding, person_type, state)
                VALUES (:id, :name, :cedula, :email, :phone, :apartment, CAST(:emb AS vector), :ptype, 'OUT')
            """),
            {"id": str(person_id), "name": args.name, "cedula": args.cedula or None,
             "email": args.email or None, "phone": args.phone or None,
             "apartment": args.apartment or None, "emb": _embedding_str(embedding),
             "ptype": args.type},
        )
        await db.commit()
    await engine.dispose()

    print()
    print("─" * 50)
    print(f"  ✅ Persona registrada exitosamente")
    print(f"  Nombre : {args.name}")
    print(f"  Tipo   : {args.type}")
    if args.cedula:    print(f"  Cédula : {args.cedula}")
    if args.apartment: print(f"  Apto   : {args.apartment}")
    print(f"  ID     : {person_id}")
    print("─" * 50)


async def cmd_update(args):
    print("Cargando modelo InsightFace...")
    app = _load_model()
    embedding = _extract_embedding(app, args.photo)
    print(f"Embedding extraído ({len(embedding)}d).")

    engine = create_async_engine(POSTGRES_URL, echo=False)
    async with async_sessionmaker(engine, expire_on_commit=False)() as db:
        row = (await db.execute(text("SELECT id, full_name FROM people WHERE cedula = :c"), {"c": args.cedula})).first()
        if not row:
            print(f"[ERROR] No se encontró ninguna persona con cédula {args.cedula}.")
            await engine.dispose(); sys.exit(1)

        await db.execute(
            text("UPDATE people SET embedding = CAST(:emb AS vector) WHERE cedula = :c"),
            {"emb": _embedding_str(embedding), "c": args.cedula},
        )
        await db.commit()
    await engine.dispose()

    print()
    print("─" * 50)
    print(f"  ✅ Foto actualizada para: {row.full_name}")
    print(f"  Cédula : {args.cedula}")
    print("─" * 50)


async def cmd_delete(args):
    engine = create_async_engine(POSTGRES_URL, echo=False)
    async with async_sessionmaker(engine, expire_on_commit=False)() as db:
        row = (await db.execute(text("SELECT id, full_name FROM people WHERE cedula = :c"), {"c": args.cedula})).first()
        if not row:
            print(f"[ERROR] No se encontró ninguna persona con cédula {args.cedula}.")
            await engine.dispose(); sys.exit(1)

        confirm = input(f"¿Eliminar a '{row.full_name}' (cédula {args.cedula})? [s/N]: ").strip().lower()
        if confirm != 's':
            print("Cancelado.")
            await engine.dispose(); return

        await db.execute(text("DELETE FROM events WHERE person_id = :id"), {"id": str(row.id)})
        await db.execute(text("DELETE FROM people WHERE cedula = :c"), {"c": args.cedula})
        await db.commit()
    await engine.dispose()

    print(f"  🗑️  '{row.full_name}' eliminado correctamente.")


async def cmd_list(_args):
    engine = create_async_engine(POSTGRES_URL, echo=False)
    async with async_sessionmaker(engine, expire_on_commit=False)() as db:
        rows = (await db.execute(text(
            "SELECT full_name, cedula, apartment, person_type, state, created_at FROM people ORDER BY created_at DESC"
        ))).fetchall()
    await engine.dispose()

    if not rows:
        print("No hay personas registradas.")
        return

    print()
    print(f"  {'NOMBRE':<25} {'CÉDULA':<12} {'APTO':<8} {'TIPO':<10} {'ESTADO'}")
    print("  " + "─" * 65)
    for r in rows:
        print(f"  {r.full_name:<25} {r.cedula or '-':<12} {r.apartment or '-':<8} {r.person_type:<10} {r.state}")
    print()


# ── MAIN ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Edge Guard — Gestión de personas")
    sub = parser.add_subparsers(dest="cmd", required=True)

    # add
    p_add = sub.add_parser("add", help="Registrar nueva persona")
    p_add.add_argument("--name",      required=True)
    p_add.add_argument("--photo",     required=True)
    p_add.add_argument("--cedula",    default=None)
    p_add.add_argument("--email",     default=None)
    p_add.add_argument("--phone",     default=None)
    p_add.add_argument("--apartment", default=None)
    p_add.add_argument("--type",      default="client", choices=["client", "visitor", "employee"])

    # update
    p_upd = sub.add_parser("update", help="Actualizar foto de una persona")
    p_upd.add_argument("--cedula", required=True)
    p_upd.add_argument("--photo",  required=True)

    # delete
    p_del = sub.add_parser("delete", help="Eliminar una persona")
    p_del.add_argument("--cedula", required=True)

    # list
    sub.add_parser("list", help="Listar todas las personas registradas")

    args = parser.parse_args()
    cmds = {"add": cmd_add, "update": cmd_update, "delete": cmd_delete, "list": cmd_list}
    asyncio.run(cmds[args.cmd](args))


if __name__ == "__main__":
    main()
