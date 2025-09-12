import { useEffect, useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import type { DataTablePageEvent } from "primereact/datatable";

import { Column } from "primereact/column";
import { Checkbox } from "primereact/checkbox";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

export default function ArtworksTable() {
    
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(12);
  const [loading, setLoading] = useState(false);
  const [selectedMap, setSelectedMap] = useState<{ [id: number]: Artwork }>({});
  const [selectedRows, setSelectedRows] = useState<Artwork[]>([]);
  const [rowCountInput, setRowCountInput] = useState("");

  const overlayRef = useRef<OverlayPanel>(null);

  useEffect(() => {
    loadArtworks();
  }, [page, rows]);

  async function loadArtworks() {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.artic.edu/api/v1/artworks?page=${page + 1}&limit=${rows}`
      );
      const data = await response.json();
      setArtworks(data.data);
      setTotalRecords(data.pagination.total);
      const currentSelected = data.data.filter(
        (art: Artwork) => selectedMap[art.id]
      );
      setSelectedRows(currentSelected);
    } catch (err) {
      console.error("Error fetching artworks:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleTableSelectionChange(event: { value: Artwork[] }) {
    const updatedSelection = { ...selectedMap };
    artworks.forEach((art) => {
      if (event.value.find((a) => a.id === art.id)) {
        updatedSelection[art.id] = art;
      } else {
        delete updatedSelection[art.id];
      }
    });
    setSelectedMap(updatedSelection);
    setSelectedRows(event.value);
  }

  function handleRowCountSubmit() {
    const countToSelect = parseInt(rowCountInput);
    if (isNaN(countToSelect) || countToSelect <= 0) return;

    const updatedSelection = { ...selectedMap };
    let selectedCount = 0;
    let currentPageIndex = 0;

    async function selectRowsAcrossPages() {
      while (
        selectedCount < countToSelect &&
        currentPageIndex * rows < totalRecords
      ) {
        const response = await fetch(
          `https://api.artic.edu/api/v1/artworks?page=${
            currentPageIndex + 1
          }&limit=${rows}`
        );
        const data = await response.json();

        for (let art of data.data) {
          if (selectedCount < countToSelect) {
            updatedSelection[art.id] = art;
            selectedCount++;
          }
        }
        currentPageIndex++;
      }

      setSelectedMap(updatedSelection);
      const visibleSelected = artworks.filter(
        (art) => updatedSelection[art.id]
      );
      setSelectedRows(visibleSelected);
    }

    selectRowsAcrossPages();
    overlayRef.current?.hide();
  }

  const titleColumnHeader = (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <Button
        icon="pi pi-chevron-down"
        className="p-button-text p-button-rounded"
        onClick={(e) => overlayRef.current?.toggle(e)}
      />
      <span style={{ fontWeight: 600 }}>Title</span>
      <OverlayPanel ref={overlayRef} className="p-4 rounded shadow-md">
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <InputText
            placeholder="Enter number of rows..."
            value={rowCountInput}
            onChange={(e) => setRowCountInput(e.target.value)}
          />
          <Button
            label="Select"
            onClick={handleRowCountSubmit}
            className="p-button-sm p-button-primary"
          />
        </div>
      </OverlayPanel>
    </div>
  );

  return (
    <div
      style={{ padding: "1rem", background: "#f9f9f9", borderRadius: "8px" }}
    >
      <h2 style={{ marginBottom: "1rem", color: "#333" }}>
        Artworks Collection
      </h2>
      <DataTable
        value={artworks}
        paginator
        rows={rows}
        totalRecords={totalRecords}
        lazy
        first={page * rows}
        onPage={(e: DataTablePageEvent) => {
          setPage(e.page!);
          setRows(e.rows!);
        }}
        loading={loading}
        selection={selectedRows}
        onSelectionChange={handleTableSelectionChange}
        selectionMode="checkbox" // <-- explicitly define row selection
        dataKey="id"
        rowHover
        className="shadow-sm"
      >
        <Column
          selectionMode="multiple"
          headerStyle={{ width: "3em" }}
          body={(art) => (
            <Checkbox
              inputId={String(art.id)}
              checked={!!selectedMap[art.id]}
              onChange={(e) => {
                const updatedSelection = { ...selectedMap };
                if (e.checked) {
                  updatedSelection[art.id] = art;
                } else {
                  delete updatedSelection[art.id];
                }
                setSelectedMap(updatedSelection);
                setSelectedRows(artworks.filter((a) => updatedSelection[a.id]));
              }}
            />
          )}
        />
        <Column field="title" header={titleColumnHeader} />
        <Column field="place_of_origin" header="Place of Origin" />
        <Column field="artist_display" header="Artist" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Start Date" />
        <Column field="date_end" header="End Date" />
      </DataTable>
    </div>
  );
}
