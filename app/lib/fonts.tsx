import { Inter, Mohave, Poppins } from "next/font/google";
import localFont from "next/font/local";

export const clashGrotesk = localFont({ src: "fonts/ClashGrotesk-Variable.ttf" });
export const inter = Inter({ subsets: ["latin"] });
export const mohave = Mohave({ subsets: ["latin"] });
export const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "700"] });
