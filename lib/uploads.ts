import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { BRAND_IMAGE_MAX_BYTES } from "@/lib/validations/brand";
import { VENDOR_FILE_MAX_BYTES } from "@/lib/validations/admin-vendor";
import { PRODUCT_IMAGE_MAX_BYTES } from "@/lib/validations/product";

/*
 * TODO(storage): DEVELOPMENT-ONLY local storage. Before production, move uploads to cloud object
 * storage (S3 / Cloudflare R2) and store the object URL instead. Files written to /public at
 * runtime are not served by `next start` after a build, are lost on redeploys and are not shared
 * between instances. Private documents need a private bucket + signed, admin-only downloads.
 */

const PUBLIC_DIR = path.join(process.cwd(), "public");
type Folder = "brands" | "categories" | "vendors" | "products";
const dirOf = (folder: Folder) => path.join(PUBLIC_DIR, "uploads", folder);
const prefixOf = (folder: Folder) => `/uploads/${folder}/`;
const STORED_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Private documents live OUTSIDE /public, so they are never served as static files. */
const PRIVATE_DOC_DIR = path.join(process.cwd(), "storage", "vendor-documents");
const STORED_DOC = /^[0-9a-f-]{36}\.(pdf|doc|docx|jpg|png|webp)$/;
type DocKind = "pdf" | "doc" | "docx" | "jpg" | "png" | "webp";
const DOC_CONTENT_TYPE: Record<DocKind, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export class UploadError extends Error {}

/** Identify the real image type from its first bytes. The client-reported MIME type is not trusted. */
function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  const at = (i: number, ...sig: number[]) => sig.every((b, k) => bytes[i + k] === b);
  if (at(0, 0xff, 0xd8, 0xff)) return "jpg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "webp"; // "RIFF"…"WEBP"
  return null;
}

/** PDF, Word (.doc = OLE2, .docx = ZIP) or an image, again from the bytes, not the name. */
function sniffDocument(bytes: Uint8Array, fileName: string): DocKind | null {
  const at = (i: number, ...sig: number[]) => sig.every((b, k) => bytes[i + k] === b);
  if (at(0, 0x25, 0x50, 0x44, 0x46)) return "pdf"; // "%PDF"
  if (at(0, 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) return "doc";
  if (at(0, 0x50, 0x4b, 0x03, 0x04) && /\.docx$/i.test(fileName)) return "docx"; // ZIP container named .docx
  return sniffImage(bytes); // jpg / png / webp
}

/**
 * Validates an image on the server (real byte size + magic bytes) and writes it under a random
 * UUID name — never the uploader's filename. Returns the public path to store.
 */
async function saveImage(file: File, folder: Folder, maxBytes = BRAND_IMAGE_MAX_BYTES): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) throw new UploadError("The image file is empty");
  if (bytes.byteLength > maxBytes) throw new UploadError(`Image must be ${maxBytes / (1024 * 1024)} MB or smaller`);

  const ext = sniffImage(bytes);
  if (!ext) throw new UploadError("That file isn't a valid JPG, PNG or WebP image");

  const name = `${randomUUID()}.${ext}`;
  await mkdir(dirOf(folder), { recursive: true });
  await writeFile(path.join(dirOf(folder), name), bytes);
  return `${prefixOf(folder)}${name}`;
}

/** Deletes a stored image. Ignores anything that isn't one of our generated files. */
async function deleteImage(publicPath: string | null | undefined, folder: Folder) {
  const prefix = prefixOf(folder);
  if (!publicPath?.startsWith(prefix)) return;
  const name = publicPath.slice(prefix.length);
  if (!STORED_NAME.test(name)) return; // blocks "../" and foreign paths
  try {
    await unlink(path.join(dirOf(folder), name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[uploads] could not delete", name, error);
  }
}

export const saveBrandImage = (file: File) => saveImage(file, "brands");
export const deleteBrandImage = (publicPath: string | null | undefined) => deleteImage(publicPath, "brands");
export const saveCategoryImage = (file: File) => saveImage(file, "categories");
export const deleteCategoryImage = (publicPath: string | null | undefined) => deleteImage(publicPath, "categories");
/** Vendor images: 1 MB by default (Add New Vendor); the vendor profile passes its own 2 MB limit. */
export const saveVendorImage = (file: File, maxBytes = VENDOR_FILE_MAX_BYTES) => saveImage(file, "vendors", maxBytes);
export const deleteVendorImage = (publicPath: string | null | undefined) => deleteImage(publicPath, "vendors");

/** Product thumbnail, gallery and variation images (vendoraddproduct design: max 1 MB). */
export const saveProductImage = (file: File) => saveImage(file, "products", PRODUCT_IMAGE_MAX_BYTES);
export const deleteProductImage = (publicPath: string | null | undefined) => deleteImage(publicPath, "products");

const ADMIN_DOC_KINDS: DocKind[] = ["pdf", "doc", "docx", "jpg"];
const KIND_LABEL: Record<DocKind, string> = { pdf: "PDF", doc: "DOC", docx: "DOCX", jpg: "JPG", png: "PNG", webp: "WebP" };

/**
 * Saves a vendor's TIN certificate PRIVATELY (outside /public — never served as a static file).
 * Defaults match Add New Vendor (PDF/DOC/DOCX/JPG, 1 MB); the vendor profile passes PDF or image, 5 MB.
 * Returns the stored file name (not a URL). TODO(storage): private bucket + signed URLs in production.
 */
export async function saveVendorDocument(file: File, opts: { maxBytes?: number; allow?: DocKind[] } = {}): Promise<string> {
  const maxBytes = opts.maxBytes ?? VENDOR_FILE_MAX_BYTES;
  const allow = opts.allow ?? ADMIN_DOC_KINDS;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) throw new UploadError("The certificate file is empty");
  if (bytes.byteLength > maxBytes) throw new UploadError(`Certificate must be ${maxBytes / (1024 * 1024)} MB or smaller`);

  const ext = sniffDocument(bytes, file.name);
  if (!ext || !allow.includes(ext)) {
    const list = allow.map((k) => KIND_LABEL[k]);
    throw new UploadError(`That file isn't a valid ${list.slice(0, -1).join(", ")} or ${list.at(-1)}`);
  }

  const name = `${randomUUID()}.${ext}`;
  await mkdir(PRIVATE_DOC_DIR, { recursive: true });
  await writeFile(path.join(PRIVATE_DOC_DIR, name), bytes);
  return name;
}

export async function deleteVendorDocument(name: string | null | undefined) {
  if (!name || !STORED_DOC.test(name)) return;
  try {
    await unlink(path.join(PRIVATE_DOC_DIR, name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[uploads] could not delete document", name, error);
  }
}

/**
 * Reads a stored private document for an authorized route handler (owner or admin). Returns null
 * for unknown/foreign names or missing files. Callers must check permissions first.
 */
export async function readVendorDocument(name: string | null | undefined): Promise<{ bytes: Uint8Array; contentType: string; ext: DocKind } | null> {
  if (!name || !STORED_DOC.test(name)) return null;
  try {
    const bytes = new Uint8Array(await readFile(path.join(PRIVATE_DOC_DIR, name)));
    const ext = name.split(".").pop() as DocKind;
    return { bytes, contentType: DOC_CONTENT_TYPE[ext], ext };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[uploads] could not read document", name, error);
    return null;
  }
}
