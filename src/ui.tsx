import {
  Button,
  Container,
  render,
  VerticalSpace,
  FileUploadDropzone,
  Text,
} from "@create-figma-plugin/ui";
import { emit } from "@create-figma-plugin/utilities";
import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { InsertCodeHandler } from "./types";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";

const ACCEPTED_FILE_TYPES = ["application/pdf"];

function _arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function Plugin() {
  const [code, setCode] = useState(`function add(a, b) {\n  return a + b;\n}`);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js";
  }, []);

  const handleInsertCodeButtonClick = useCallback(
    function () {
      emit<InsertCodeHandler>("INSERT_CODE", code);
    },
    [code]
  );

  const handleSelectedFiles = useCallback(
    (files: Array<File>) => {
      console.log("here", files);
      if (files.length > 0) {
        console.log("got a file");
        const arrayBufPromise = files[0].arrayBuffer() as Promise<ArrayBuffer>;
        arrayBufPromise.then((arrayBuf: ArrayBuffer) => {
          console.log("resolved promise");
          setPdfData(arrayBuf);
        });
      }
    },
    [setPdfData]
  );

  useEffect(() => {
    setPdfUploaded(pdfData !== null);
  }, [pdfData]);

  return (
    <Container>
      <VerticalSpace space="small" />
      {!pdfUploaded && (
        <FileUploadDropzone
          acceptedFileTypes={ACCEPTED_FILE_TYPES}
          onSelectedFiles={handleSelectedFiles}
          multiple={false}>
          <Text align="center" muted>
            Drop a PDF file here, or click to upload
          </Text>
        </FileUploadDropzone>
      )}
      {pdfUploaded && pdfData !== null && (
        <div style={{ border: "1px solid gray" }}>
          <Document
            file={pdfData}
            onLoadError={console.error}
            onLoadSuccess={(pdf) => {
              setNumPages(pdf.numPages);
              console.log("loaded:", pdf);
            }}>
            <Page pageNumber={1} width={350} />
          </Document>
        </div>
      )}
      <VerticalSpace space="large" />
      <Button
        fullWidth
        disabled={!pdfUploaded}
        onClick={handleInsertCodeButtonClick}>
        Insert {numPages} {numPages === 1 ? "page" : "pages"}
      </Button>
      <VerticalSpace space="small" />
    </Container>
  );
}

export default render(Plugin);
