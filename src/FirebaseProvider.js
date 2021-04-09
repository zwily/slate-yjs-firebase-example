import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import { Observable } from "lib0/observable.js";
import { toSharedType } from "slate-yjs";
import * as base64 from "byte-base64";

const firebase = window.firebase;

class FirebaseProvider extends Observable {
  constructor(slug, doc) {
    super();

    this.awareness = new awarenessProtocol.Awareness(doc);

    this.docRef = firebase.database().ref("docs").child(slug);
    this.updatesRef = this.docRef.child("updates");
    this.usersRef = this.docRef.child("users");
    this.bootstrapRef = this.docRef.child("bootstrap");
    this.userRef = this.usersRef.child(doc.clientID);
    this.doc = doc;

    this._onRemoteUpdateAdded = (ss) => {
      Y.applyUpdate(this.doc, base64.base64ToBytes(ss.val()), this);
    };

    this._onLocalDocUpdated = (update, origin) => {
      if (origin !== this) {
        this.updatesRef.push(base64.bytesToBase64(update));
      }
    };

    this._onRemoteAwarenessUpdated = (ss) => {
      const update = base64.base64ToBytes(ss.val());
      awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this);
    };

    this._onLocalAwarenessUpdated = ({ added, updated, removed }) => {
      const changedClients = [...added, ...updated, ...removed];
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        changedClients
      );
      const update = base64.bytesToBase64(awarenessUpdate);
      this.userRef.set(update);
    };

    this.updatesRef.on("child_added", this._onRemoteUpdateAdded);
    this.doc.on("update", this._onLocalDocUpdated);
    this.usersRef.on("child_changed", this._onRemoteAwarenessUpdated);
    this.awareness.on("update", this._onLocalAwarenessUpdated);

    this.bootstrapContent();
  }

  bootstrapContent() {
    // HACK: clients will all try to set themselves as bootstrapper,
    // but only one will succeed and that client gets to set the initial
    // content.
    this.bootstrapRef.transaction(
      (current) => {
        if (current === null) {
          return this.doc.clientID;
        }
        return;
      },
      (error, committed) => {
        if (error) {
          console.log("bootstrapping tx failed", error);
        } else if (!committed) {
          // someone else bootstrapped
        } else {
          toSharedType(this.doc.getArray("content"), [
            { type: "paragraph", children: [{ text: "Hello World!" }] },
          ]);
        }
      }
    );
  }

  connect() {
    firebase.database().goOnline();
    this.emit("status", [{ status: "connected" }]);
  }

  disconnect() {
    firebase.database().goOffline();
    this.emit("status", [{ status: "disconnected" }]);
  }

  destroy() {
    this.updatesRef.off("child_added", this._onRemoteUpdateAdded);
    this.doc.off("update", this._onLocalDocUpdated);
    this.usersRef.on("child_changed", this._onRemoteAwarenessUpdated);
    this.awareness.off("update", this._onLocalAwarenessUpdated);

    this.disconnect();
    super.destroy();
  }
}

export default FirebaseProvider;
