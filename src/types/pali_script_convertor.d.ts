/**
 * `pali_script_convertor` ships as plain CommonJS with no bundled types, so the
 * two symbols we use are declared here. Keep the script codes in sync with the
 * package's `SCRIPTS` export.
 */
declare module "pali_script_convertor" {
  export const SCRIPTS: {
    readonly SI: "si";
    readonly HI: "hi";
    readonly RO: "ro";
    readonly THAI: "th";
    readonly LAOS: "lo";
    readonly MY: "my";
    readonly KM: "km";
    readonly BENG: "be";
    readonly ASSE: "as";
    readonly GURM: "gm";
    readonly THAM: "tt";
    readonly GUJA: "gj";
    readonly TELU: "te";
    readonly KANN: "ka";
    readonly MALA: "mm";
    readonly BRAH: "br";
    readonly TIBT: "tb";
    readonly CYRL: "cy";
  };

  /**
   * Converts Pali `text` into `toScript`. When `fromScript` is omitted the
   * source script is detected per character, so mixed-script input works.
   *
   * Throws a `TypeError` for non-string input and an `Error` for a script code
   * the package does not support.
   */
  export function convertPali(
    text: string,
    toScript: string,
    fromScript?: string | null,
  ): string;
}
