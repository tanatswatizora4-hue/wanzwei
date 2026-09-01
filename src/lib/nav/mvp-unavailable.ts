import { notFound } from "next/navigation";

/** Post-MVP / demo surfaces stay in the tree but are not a production product. */
export function mvpSurfaceUnavailable(): never {
  notFound();
}
