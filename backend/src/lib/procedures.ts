import { Procedimiento, TecnicaSesion } from "@prisma/client";

export interface ProcedureMetadata {
  key: Procedimiento;
  nombre: string;
  descripcion: string;
  tecnicasValidas: TecnicaSesion[];
}

export const PROCEDURES: ProcedureMetadata[] = [
  {
    key: Procedimiento.RINOPLASTIA,
    nombre: "Rinoplastia",
    descripcion:
      "Remodele el puente nasal, la punta y las fosas nasales. Nuestra herramienta de simulación más popular para consultas de rinoplastia quirúrgica y no quirúrgica.",
    tecnicasValidas: [TecnicaSesion.QUIRURGICO, TecnicaSesion.RINOMODELACION],
  },
  {
    key: Procedimiento.LIFTING_CEJAS,
    nombre: "Lifting de cejas",
    descripcion:
      "Simule ajustes de posición de cejas y suavizado de frente para mostrar a los pacientes un aspecto rejuvenecido y natural.",
    tecnicasValidas: [TecnicaSesion.QUIRURGICO, TecnicaSesion.ENDOSCOPICO],
  },
  {
    key: Procedimiento.AUMENTO_MENTON,
    nombre: "Aumento de mentón y mandíbula",
    descripcion:
      "Visualice cambios en la proyección del mentón y la definición de la mandíbula. Ideal para implantes de mentón y contorno mandibular.",
    tecnicasValidas: [TecnicaSesion.IMPLANTE, TecnicaSesion.FILLER],
  },
  {
    key: Procedimiento.AUMENTO_LABIOS,
    nombre: "Aumento de labios",
    descripcion:
      "Muestre a los pacientes mejoras realistas de volumen y forma de labios antes de comprometerse con rellenos o aumento quirúrgico.",
    tecnicasValidas: [TecnicaSesion.FILLER, TecnicaSesion.QUIRURGICO],
  },
  {
    key: Procedimiento.LIFTING_CUELLO,
    nombre: "Lifting de cuello",
    descripcion:
      "Demuestre mejoras en el contorno del cuello y refinamiento del perfil para consultas de lifting de cuello y liposucción.",
    tecnicasValidas: [TecnicaSesion.QUIRURGICO, TecnicaSesion.LIPOSUCCION],
  },
  {
    key: Procedimiento.BLEFAROPLASTIA,
    nombre: "Blefaroplastia",
    descripcion:
      "Simule resultados de cirugía de párpados superiores e inferiores. Ayude a los pacientes a ver cómo el rejuvenecimiento de párpados mejora su apariencia.",
    tecnicasValidas: [TecnicaSesion.SUPERIOR, TecnicaSesion.INFERIOR, TecnicaSesion.COMPLETO],
  },
  {
    key: Procedimiento.SUAVIZADO_PIEL,
    nombre: "Suavizado y estiramiento de piel",
    descripcion:
      "Previsualización del refinamiento de textura y efectos de estiramiento de piel para procedimientos láser, microneedling y quirúrgicos.",
    tecnicasValidas: [TecnicaSesion.LASER, TecnicaSesion.MICRONEEDLING, TecnicaSesion.QUIRURGICO],
  },
  {
    key: Procedimiento.FEMINIZACION_FACIAL,
    nombre: "Feminización facial",
    descripcion:
      "Simulación completa de cirugía de feminización facial que cubre frente, nariz, mentón, mandíbula y armonía facial general.",
    tecnicasValidas: [TecnicaSesion.QUIRURGICO],
  },
];

export const TECNICAS_POR_PROCEDIMIENTO = new Map<Procedimiento, TecnicaSesion[]>(
  PROCEDURES.map((p) => [p.key, p.tecnicasValidas])
);
