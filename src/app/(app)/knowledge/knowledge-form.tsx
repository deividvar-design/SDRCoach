"use client";

import { useActionState, useEffect, useRef } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { addKnowledgeText, uploadKnowledgeFiles, type KnowledgeState } from "./actions";

function KindSelect() {
  return (
    <div className="space-y-2">
      <Label htmlFor="kind">Type</Label>
      <Select id="kind" name="kind" defaultValue="call_transcript">
        <option value="call_transcript">Call transcripts</option>
        <option value="script">Call script</option>
        <option value="playbook">Playbook</option>
        <option value="objection_sheet">Objection sheet</option>
      </Select>
    </div>
  );
}

export function KnowledgeForm() {
  const [uploadState, uploadAction, uploading] = useActionState<KnowledgeState, FormData>(uploadKnowledgeFiles, {});
  const [textState, textAction, savingText] = useActionState<KnowledgeState, FormData>(addKnowledgeText, {});
  const uploadRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (uploadState.ok) {
      toast.success("Uploaded. The coach is reading it now.");
      uploadRef.current?.reset();
    }
  }, [uploadState]);
  useEffect(() => {
    if (textState.ok) {
      toast.success("Added. The coach is reading it now.");
      textRef.current?.reset();
    }
  }, [textState]);

  return (
    <Tabs defaultValue="upload">
      <TabsList className="mb-4">
        <TabsTrigger value="upload">Upload files</TabsTrigger>
        <TabsTrigger value="paste">Paste text</TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <form ref={uploadRef} action={uploadAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <Label htmlFor="files">CSV or text files</Label>
              <Input id="files" name="files" type="file" accept=".csv,.tsv,.txt,.md,text/csv,text/plain" multiple required />
              <p className="text-muted-foreground text-xs">
                CSV exports from Gong, Chorus, Fireflies or a dialer work as is. One utterance per row (speaker + text) or one call per row (a transcript column). Up to 8 MB each.
              </p>
            </div>
            <KindSelect />
          </div>
          {uploadState.error && <p className="text-destructive text-sm">{uploadState.error}</p>}
          <Button type="submit" disabled={uploading}>
            <UploadCloud /> {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="paste">
        <form ref={textRef} action={textAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Q3 discovery calls, logistics vertical" required />
            </div>
            <KindSelect />
          </div>
          <div className="space-y-2">
            <Label htmlFor="raw_text">Content</Label>
            <Textarea id="raw_text" name="raw_text" className="min-h-40 font-mono text-xs" placeholder="Paste the transcript or document text…" required />
          </div>
          {textState.error && <p className="text-destructive text-sm">{textState.error}</p>}
          <Button type="submit" disabled={savingText}>{savingText ? "Adding…" : "Add"}</Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
