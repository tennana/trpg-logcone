import * as zip from "@zip.js/zip.js";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import xmlEscape from "xml-escape";
import type {Decoration, ValidDecoration} from "../model/decoration";
import type {ConcatMessage} from "../model/exportMessage";
import type {Exporter, ExportResult} from "./exporter";
export default class Word implements Exporter {
    private _filePath: string;
    private readonly LINE_SEPARATOR = "<w:r><w:rPr/><w:br/></w:r>";

    public constructor(filePath: string) {
        this._filePath = filePath;
    }

    createScreenplay(messages: ConcatMessage[], decorations: ValidDecoration[], _scope: any): string {
        return messages.map((message) => {
            const decoration = message.speakerSetting?.paragraph;
            const colorTag = decoration?.color ? `<w:color w:val="${decoration.color}"/>` : "";
            const contentXml = message.content.split("\n").map(this.createParagraph.bind(this, colorTag, decorations)).join(this.LINE_SEPARATOR)
            return `<w:p>
      <w:pPr>
        <w:pStyle w:val="Normal"/>
        <w:rPr>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          ${colorTag}
        </w:rPr>
        <w:t>${message.name}</w:t>
      </w:r>
      <w:r>
        <w:rPr>
        </w:rPr>
        <w:tab/>
      </w:r>
      ${contentXml}
      ${this.LINE_SEPARATOR.repeat(decoration.lineBreakNum || 0)}
    </w:p>`;
        }).join("");
    }

    createParagraph(colorTag: string, decorations: ValidDecoration[], paragraph: string): string {
        const normalrPr = `<w:rPr>${colorTag}</w:rPr>`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        let paragraphXml = xmlEscape(paragraph) ;
        decorations.forEach(decoration => {
            paragraphXml = paragraphXml.replace(decoration.match, (word) => {
                let rPr = "";
                if (decoration.removal) {
                    word = word.replace(decoration.startChar, "").replace(decoration.endChar, "");
                }
                if (decoration.bold) {
                    rPr += "<w:b w:val=\"true\"/>";
                }
                if (decoration.colorEnabled) {
                    rPr += `<w:color w:val="${decoration.color}"/>`
                } else {
                    rPr += colorTag;
                }
                if (decoration.strikethrough) {
                    rPr += "<w:strike w:val=\"true\"/>";
                }
                if (decoration.italics) {
                    rPr += "<w:i />";
                }
                return `</w:t></w:r><w:r><w:rPr>${rPr}</w:rPr><w:t>${word}</w:t></w:r><w:r>${normalrPr}<w:t>`;
            });
        });
        return `<w:r>${normalrPr}<w:t>${paragraphXml}</w:t></w:r>`;
    }

    createTableRow(decorations: ValidDecoration[], message: ConcatMessage) {
        const decoration = message.speakerSetting?.paragraph;
        const colorTag = decoration?.color ? `<w:color w:val="${decoration.color}"/>` : "";
        const contentXml = message.content.split("\n").map(this.createParagraph.bind(this, colorTag, decorations)).join(this.LINE_SEPARATOR)
        return `<w:tr>
        <w:trPr>
        </w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcBorders>
            </w:tcBorders>
            <w:tcW w:w="30" w:type="pct"/>
            <w:textDirection w:val="tbRl"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:widowControl w:val="false"/>
              <w:rPr>
              </w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr>
                ${colorTag}
              </w:rPr>
              <w:t>${message.name}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="70" w:type="pct"/>
            <w:tcBorders>
            </w:tcBorders>
            <w:textDirection w:val="tbRl"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:widowControl w:val="false"/>
              <w:rPr>
              </w:rPr>
            </w:pPr>
            ${contentXml}
            ${this.LINE_SEPARATOR.repeat(decoration.lineBreakNum || 0)}
          </w:p>
        </w:tc>
      </w:tr>`
    }

    createTable(messages: ConcatMessage[], decoration: ValidDecoration[]): string {
        return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="dxa"/>
        <w:jc w:val="left"/>
        <w:tblInd w:w="0" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblCellMar>
          <w:top w:w="0" w:type="dxa"/>
          <w:left w:w="0" w:type="dxa"/>
          <w:bottom w:w="0" w:type="dxa"/>
          <w:right w:w="0" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="610"/>
        <w:gridCol w:w="5500"/>
      </w:tblGrid>
      ${messages.map(this.createTableRow.bind(this, decoration)).join("")}
    </w:tbl>`;
    }

    async transform(this: Word, messages: ConcatMessage[], filteredDecorations: ValidDecoration[]): Promise<ExportResult> {
        const templateDoc: ArrayBuffer = await fetch(`./template/${this._filePath}`).then(res => res.arrayBuffer());
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment
        const baseZip = new PizZip(templateDoc);
        const doc = new Docxtemplater(baseZip, {
            paragraphLoop: true,
            linebreaks: true,
        });
        doc.render({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            screenplay: this.createScreenplay.bind(this, messages, filteredDecorations),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            table: this.createTable.bind(this, messages, filteredDecorations),
            messages: messages
        })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
        const buf = doc.getZip().generate({
            type: "uint8array",
            compression: "STORE"
        }) as Uint8Array;
        const oldZip = new zip.ZipReader(new zip.Uint8ArrayReader(buf));
        const newZip = new zip.ZipWriter(new zip.BlobWriter(), {
            msDosCompatible: true,
            zipCrypto: false
        });
        for await(const entry of oldZip.getEntriesGenerator()) {
            const content = await entry.getData(new zip.BlobWriter());
            if (!entry.directory)
                await newZip.add(entry.filename, new zip.BlobReader(content), {directory: entry.directory});
        }
        const [file] = await Promise.all([
            newZip.close(),
            oldZip.close(),
        ]);
        return {
            file: new File([file], "output.docx", {lastModified: new Date().getDate()}),
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        };
    }

    createDecorationRegExp(decoration: Decoration): RegExp {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return new RegExp(escapeRegExp(xmlEscape(decoration.startChar)) + ".+?" + escapeRegExp(xmlEscape(decoration.endChar)), "g")
    }
}

const reRegExp = /[\\^$.*+?()[\]{}|]/g,
    reHasRegExp = new RegExp(reRegExp.source);

function escapeRegExp(string: string): string {
    return (string && reHasRegExp.test(string))
        ? string.replace(reRegExp, "\\$&")
        : string;
}