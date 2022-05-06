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
import { DrawImageHandler, InsertCodeHandler } from "./types";
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

function convertDataURIToBinary(dataURI: string) {
  var raw = window.atob(dataURI);
  var rawLength = raw.length;
  var array = new Uint8Array(new ArrayBuffer(rawLength));

  for (var i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

const renderPage = (
  pdf: any,
  page: any,
  pageNum: number,
  pageLimit: number
) => {
  console.log("Rendering " + pageNum + " out of " + pageLimit);
  var scale = 1.5;
  var viewport = page.getViewport({ scale: scale });
  //
  // Prepare canvas using PDF page dimensions
  //
  var canvas = document.getElementById("testCanvas") as HTMLCanvasElement;
  var context = canvas.getContext("2d") as CanvasRenderingContext2D;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  //
  // Render PDF page into canvas context
  //
  page
    .render({ canvasContext: context, viewport: viewport })
    .promise.then(() => {
      const canvasDataURL = canvas.toDataURL();
      emit<DrawImageHandler>(
        "DRAW_IMAGE",
        convertDataURIToBinary(
          canvasDataURL.substring(
            canvasDataURL.indexOf(";base64,") + ";base64,".length
          )
        ),
        viewport.width,
        viewport.height,
        pageNum - 1
      );

      if (pageNum < pageLimit) {
        pdf.getPage(pageNum + 1).then((pg: any) => {
          renderPage(pdf, pg, pageNum + 1, pageLimit);
        });
      }
    });
};

function Plugin() {
  const [code, setCode] = useState(`function add(a, b) {\n  return a + b;\n}`);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js";
  }, []);

  const handleSelectedFiles = useCallback(
    (files: Array<File>) => {
      if (files.length > 0) {
        const arrayBufPromise = files[0].arrayBuffer() as Promise<ArrayBuffer>;
        arrayBufPromise.then((arrayBuf: ArrayBuffer) => {
          setPdfData(arrayBuf);
        });
      }
    },
    [setPdfData]
  );

  useEffect(() => {
    setPdfUploaded(pdfData !== null);
  }, [pdfData]);

  const handleInsertPDF = useCallback(() => {
    pdfjs
      .getDocument({ data: new Uint8Array(pdfData as ArrayBuffer) })
      .promise.then((pdf) => {
        const numPages = pdf.numPages;
        if (numPages > 0) {
          pdf.getPage(1).then((page) => {
            renderPage(pdf, page, 1, numPages);
          });
        }
      });
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
      <canvas
        id="testCanvas"
        style={{ position: "absolute", left: 1000 }}></canvas>
      <Button fullWidth disabled={!pdfUploaded} onClick={handleInsertPDF}>
        Insert {numPages} {numPages === 1 ? "page" : "pages"}
      </Button>
      <VerticalSpace space="small" />
    </Container>
  );
}

export default render(Plugin);
