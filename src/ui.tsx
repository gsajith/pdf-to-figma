import {
  Button,
  Container,
  render,
  VerticalSpace,
  FileUploadDropzone,
  Dropdown,
  DropdownOption,
  Text,
  Inline,
  Banner,
  IconWarningFilled32,
} from "@create-figma-plugin/ui";
import { emit, on } from "@create-figma-plugin/utilities";
import { h, JSX } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { DrawImageHandler, ImageInsertedHandler } from "./types";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";

const ACCEPTED_FILE_TYPES = ["application/pdf"];
const MAX_DIM = 4080;

// Recursively render the pages one by one
const renderPage = (
  pdf: any,
  page: any,
  pageNum: number,
  pageLimit: number,
  scale: number,
  pdfName: string
) => {
  var viewport = page.getViewport({ scale: scale });

  // Prepare canvas using PDF page dimensions
  var canvas = document.getElementById("testCanvas") as HTMLCanvasElement;
  var context = canvas.getContext("2d") as CanvasRenderingContext2D;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Render PDF page into canvas context
  page
    .render({ canvasContext: context, viewport: viewport })
    .promise.then(() => {
      const canvasDataURL = canvas.toDataURL();
      emit<DrawImageHandler>(
        "DRAW_IMAGE",
        canvasDataURL.substring(
          canvasDataURL.indexOf(";base64,") + ";base64,".length
        ),
        viewport.width,
        viewport.height,
        pageNum - 1,
        pdfName + " - Page " + pageNum + " of " + pageLimit
      );

      if (pageNum < pageLimit) {
        pdf.getPage(pageNum + 1).then((pg: any) => {
          renderPage(pdf, pg, pageNum + 1, pageLimit, scale, pdfName);
        });
      }
    });
};

function Plugin() {
  const [pdfUploaded, setPdfUploaded] = useState<boolean>(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfWidth, setPdfWidth] = useState<number>(0);
  const [pdfHeight, setPdfHeight] = useState<number>(0);
  const [pdfScale, setPdfScale] = useState<number>(1);
  const [inserting, setInserting] = useState<boolean>(false);
  const [dropdownScaleValue, setDropdownScaleValue] = useState<string>("2x");
  const [insertButtonText, setInsertButtonText] =
    useState<string>("Awaiting upload");
  const options: Array<DropdownOption> = [
    { value: "0.5x" },
    { value: "0.75x" },
    { value: "1x" },
    { value: "1.5x" },
    { value: "2x" },
    { value: "3x" },
    { value: "4x" },
  ];

  useEffect(() => {
    // Set PDF.js worker on load
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js";
  }, []);

  // Callback when PDF is uploaded
  const handleSelectedFiles = useCallback(
    (files: Array<File>) => {
      if (files.length > 0) {
        setPdfName(files[0].name);
        const arrayBufPromise = files[0].arrayBuffer() as Promise<ArrayBuffer>;
        arrayBufPromise.then((arrayBuf: ArrayBuffer) => {
          setPdfData(arrayBuf);
        });
      }
    },
    [setPdfData, setPdfName]
  );

  // Set flag when PDF is uploaded successfully
  useEffect(() => {
    setPdfUploaded(pdfData !== null);
  }, [pdfData]);

  // Set numeric scale value when dropdown value changes
  useEffect(() => {
    const newScaleValue = parseFloat(dropdownScaleValue.slice(0, -1));
    setPdfWidth((pdfWidth) => pdfWidth / pdfScale);
    setPdfHeight((pdfHeight) => pdfHeight / pdfScale);
    setPdfScale(newScaleValue);
  }, [dropdownScaleValue]);

  // Update PDF width and height when the PDF data changes
  useEffect(() => {
    if (pdfData !== null) {
      pdfjs
        .getDocument({
          data: new Uint8Array(pdfData as ArrayBuffer),
        })
        .promise.then((pdf) => {
          const numPages = pdf.numPages;
          if (numPages > 0) {
            pdf.getPage(1).then((page) => {
              const viewport = page.getViewport({ scale: pdfScale });
              setPdfWidth(viewport.width);
              setPdfHeight(viewport.height);
            });
          }
        });
    }
  }, [pdfData]);

  // Update PDF width and height when the PDF scale changes
  useEffect(() => {
    setPdfWidth((pdfWidth) => pdfWidth * pdfScale);
    setPdfHeight((pdfHeight) => pdfHeight * pdfScale);
  }, [pdfScale]);

  // When "Insert" button is pressed, render the PDF images
  const handleInsertPDF = useCallback(() => {
    if (pdfData !== null) {
      setInserting(true);
      pdfjs
        .getDocument({
          data: new Uint8Array(pdfData as ArrayBuffer),
          fontExtraProperties: true,
        })
        .promise.then((pdf) => {
          const numPages = pdf.numPages;
          if (numPages > 0) {
            pdf.getPage(1).then((page) => {
              renderPage(
                pdf,
                page,
                1,
                numPages,
                pdfScale,
                pdfName === null ? "Empty.pdf" : pdfName
              );
            });
          }
        });
    }
  }, [pdfData, pdfName, pdfScale]);

  useEffect(() => {
    if (numPages === null) {
      setInserting(false);
      setInsertButtonText("Awaiting upload");
    } else if (inserting) {
      setInsertButtonText("Inserting ...");
    } else {
      if (numPages === 1) {
        setInsertButtonText("Insert 1 page");
      } else {
        setInsertButtonText("Insert " + numPages + " pages");
      }
    }
  }, [numPages, inserting]);

  // Listen for event callback from main.ts when images are inserted
  useEffect(() => {
    return on<ImageInsertedHandler>("IMAGE_INSERTED", (index: number) => {
      setInserting(numPages === null || index + 1 < numPages);
    });
  }, [numPages]);

  return (
    <Container>
      <VerticalSpace space="small" />

      {!pdfUploaded && (
        <FileUploadDropzone
          acceptedFileTypes={ACCEPTED_FILE_TYPES}
          onSelectedFiles={handleSelectedFiles}
          multiple={false}>
          <div
            style={{
              display: "flex",
              height: 290,
              justifyContent: "center",
              alignItems: "center",
            }}>
            <Text align="center" muted>
              Drop a PDF file here, or click to upload
            </Text>
          </div>
        </FileUploadDropzone>
      )}

      {pdfUploaded && pdfData !== null && (
        <div
          style={{
            border: "1px solid #cacaca",
            position: "relative",
            height: 350,
            overflowY: "scroll",
          }}>
          <Document
            file={pdfData}
            onLoadError={console.error}
            onLoadSuccess={(pdf) => {
              setNumPages(pdf.numPages);
            }}>
            <Page
              pageNumber={1}
              width={Math.min(320, pdfWidth / pdfScale) * pdfScale}
            />
          </Document>
        </div>
      )}

      <canvas
        id="testCanvas"
        style={{
          position: "fixed",
          left: 1000,
        }}></canvas>

      {pdfUploaded &&
        pdfData !== null &&
        (pdfWidth > MAX_DIM || pdfHeight > MAX_DIM) && (
          <div
            style={{
              position: "fixed",
              bottom: 80,
              left: 48,
              borderRadius: 8,
              overflow: "hidden",
            }}>
            <Banner icon={<IconWarningFilled32 />} type="warning">
              These PDF dimensions may be too large
            </Banner>
          </div>
        )}

      {pdfUploaded && (
        <div style={{ position: "fixed", top: 12, right: 12 }}>
          <div
            style={{
              backgroundColor: "#5a5a5a",
              color: "white",
              padding: "8px 12px",
              borderRadius: "0px 0px 0px 12px",
            }}>
            {Math.round(pdfWidth)} x {Math.round(pdfHeight)}
          </div>
        </div>
      )}
      <div style={{ position: "fixed", bottom: 12, left: 20, width: 346 }}>
        <Inline style={{ marginBottom: 8 }} space="medium">
          <Inline space="extraSmall">
            <div>Scale:</div>
            <Dropdown
              style={{ minWidth: 60 }}
              disabled={!pdfUploaded}
              onChange={(event: JSX.TargetedEvent<HTMLInputElement>) => {
                setDropdownScaleValue(event.currentTarget.value);
              }}
              options={options}
              value={dropdownScaleValue}
            />
          </Inline>
          <Button
            disabled={!pdfUploaded || inserting}
            onClick={handleInsertPDF}
            style={{ minWidth: 120, background: "#1166b6" }}>
            {insertButtonText}
          </Button>
          <Button
            disabled={!pdfUploaded || inserting}
            destructive
            secondary
            style={{ backgroundColor: "white" }}
            onClick={() => {
              setPdfData(null);
              setPdfName(null);
              setNumPages(null);
            }}>
            Clear PDF
          </Button>
        </Inline>
      </div>
      <VerticalSpace space="small" />
    </Container>
  );
}

export default render(Plugin);
