// Anchor and spl-token expect Node's Buffer; must be imported before them.
import { Buffer } from "buffer";
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
