import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui class merge helper. Use everywhere classes are conditional. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
