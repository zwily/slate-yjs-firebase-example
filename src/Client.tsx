import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState } from "react";
import { createEditor, Node } from "slate";
import { withHistory } from "slate-history";
import { withReact } from "slate-react";
import { SyncElement, useCursors, withCursor, withYjs } from "slate-yjs";
import FirebaseProvider from "./FirebaseProvider";
import * as Y from "yjs";
import { Button, H4, Instance, Title } from "./Components";
import EditorFrame from "./EditorFrame";
import { withLinks } from "./plugins/link";
import randomColor from "randomcolor";

interface ClientProps {
  name: string;
  id: string;
  slug: string;
  removeUser: (id: any) => void;
}

// @refresh reset
const Client: React.FC<ClientProps> = ({ id, name, slug, removeUser }) => {
  const [value, setValue] = useState<Node[]>([]);
  const [isOnline, setOnlineState] = useState<boolean>(false);

  const color = useMemo(
    () =>
      randomColor({
        luminosity: "dark",
        format: "rgba",
        alpha: 1,
      }),
    []
  );

  const [sharedType, provider] = useMemo(() => {
    const doc = new Y.Doc();
    const sharedType = doc.getArray<SyncElement>("content");
    const provider = new FirebaseProvider(slug, doc);

    return [sharedType, provider];
  }, [id]);

  const editor = useMemo(() => {
    const editor = withCursor(
      withYjs(withLinks(withReact(withHistory(createEditor()))), sharedType),
      provider.awareness
    );

    return editor;
  }, [sharedType, provider]);

  useEffect(() => {
    provider.on("status", ({ status }: { status: string }) => {
      setOnlineState(status === "connected");
    });

    provider.awareness.setLocalState({
      alphaColor: color.slice(0, -2) + "0.2)",
      color,
      name,
    });

    provider.connect();

    return () => {
      provider.disconnect();
    };
  }, [provider]);

  const { decorate } = useCursors(editor);

  const toggleOnline = () => {
    isOnline ? provider.disconnect() : provider.connect();
  };

  return (
    <Instance online={isOnline}>
      <Title>
        <Head>Editor: {name}</Head>
        <div style={{ display: "flex", marginTop: 10, marginBottom: 10 }}>
          <Button type="button" onClick={toggleOnline}>
            Go {isOnline ? "offline" : "online"}
          </Button>
          <Button type="button" onClick={() => removeUser(id)}>
            Remove
          </Button>
        </div>
      </Title>

      <EditorFrame
        editor={editor}
        value={value}
        decorate={decorate}
        onChange={(value: Node[]) => setValue(value)}
      />
    </Instance>
  );
};

export default Client;

const Head = styled(H4)`
  margin-right: auto;
`;
