"use client";

import { FileDrop } from "@/components/pdfui";
import { Banner } from "@/components/ui";

export default function Phase3Placeholder({ name }: { name: string }) {
  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <Banner kind="info" title="Coming soon">
        {name} requires server-side processing to extract tables, recognize text, or convert to Office formats.
        <br/><br/>
        Because DocuVibe is currently a 100% offline, privacy-first tool, this feature is marked for Phase 3 and will require an optional backend or local sidecar.
      </Banner>

      <FileDrop
        accept="application/pdf"
        multiple={false}
        onFiles={() => {}}
        icon="alert"
        title={<>Drop a PDF or <span className="em">browse</span></>}
        sub="This tool is not yet functional. Your files will not be uploaded."
        hint="No server connection established"
      />
    </div>
  );
}
