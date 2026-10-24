"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";

import { decideRequest, type DecideState } from "./actions";
import { APPROVAL_ACTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: DecideState = {};

export function DecisionForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(
    decideRequest,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={requestId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Catatan</Label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          placeholder="Wajib diisi bila menolak; opsional bila menyetujui."
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button
          type="submit"
          name="_action"
          value={APPROVAL_ACTIONS.APPROVED}
          disabled={pending}
        >
          <Check className="size-4" />
          Setujui
        </Button>
        <Button
          type="submit"
          name="_action"
          value={APPROVAL_ACTIONS.REJECTED}
          variant="destructive"
          disabled={pending}
        >
          <X className="size-4" />
          Tolak
        </Button>
      </div>
    </form>
  );
}
