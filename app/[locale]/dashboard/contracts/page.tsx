"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, FileText, RefreshCw, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Can } from "@/components/auth/can";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import {
  ContractFormDialog,
  type ContractParty,
} from "@/components/contracts/contract-form-dialog";
import {
  useOwnerContracts,
  useWorkerContracts,
  useCreateOwnerContract,
  useRenewOwnerContract,
  useDeactivateOwnerContract,
  useCreateWorkerContract,
  useRenewWorkerContract,
  useDeactivateWorkerContract,
} from "@/hooks/use-contracts";
import { useOwnerList } from "@/hooks/use-owners";
import { useWorkers } from "@/hooks/use-workers";
import { getApiErrorCode } from "@/lib/http/api-error";
import type { ContractType, CreateContractRequest } from "@/lib/types/contract.types";

const KNOWN_ERRORS = new Set([
  "no_active_contract_to_renew",
  "owner_profile_not_found",
  "worker_not_found",
  "contract_not_found",
  "contract_already_inactive",
]);

interface Row {
  contractId: string;
  partyId: string;
  partyName: string;
  partyEmail: string;
  eligibleFrom: string;
  eligibleTo: string;
  fileName: string;
  fileUrl: string;
  isActive: boolean;
  createdAt: string;
}

type ModalState =
  | { type: "create" }
  | { type: "renew"; row: Row }
  | { type: "deactivate"; row: Row }
  | null;

function fmtDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { dateStyle: "medium" });
}

export default function ContractsPage() {
  const t = useTranslations("contracts");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [tab, setTab] = useState<ContractType>("owner");
  const [modal, setModal] = useState<ModalState>(null);

  const ownerContracts = useOwnerContracts();
  const workerContracts = useWorkerContracts();
  const { data: owners = [] } = useOwnerList();
  const { data: workersPage } = useWorkers({
    onboardingStatus: "Active",
    pageSize: 100,
  });
  const workers = useMemo(() => workersPage?.items ?? [], [workersPage]);

  const createOwner = useCreateOwnerContract();
  const renewOwner = useRenewOwnerContract();
  const deactivateOwner = useDeactivateOwnerContract();
  const createWorker = useCreateWorkerContract();
  const renewWorker = useRenewWorkerContract();
  const deactivateWorker = useDeactivateWorkerContract();

  const isOwner = tab === "owner";
  const query = isOwner ? ownerContracts : workerContracts;
  const createMut = isOwner ? createOwner : createWorker;
  const renewMut = isOwner ? renewOwner : renewWorker;
  const deactivateMut = isOwner ? deactivateOwner : deactivateWorker;

  const rows = useMemo<Row[]>(() => {
    if (isOwner) {
      return (ownerContracts.data ?? []).map((c) => ({
        contractId: c.id,
        partyId: c.ownerUserId,
        partyName: c.ownerFullName,
        partyEmail: c.ownerEmail,
        eligibleFrom: c.eligibleFrom,
        eligibleTo: c.eligibleTo,
        fileName: c.fileName,
        fileUrl: c.fileUrl,
        isActive: c.isActive,
        createdAt: c.createdAt,
      }));
    }
    return (workerContracts.data ?? []).map((c) => ({
      contractId: c.id,
      partyId: c.workerId,
      partyName: c.workerFullName,
      partyEmail: c.workerEmail,
      eligibleFrom: c.eligibleFrom,
      eligibleTo: c.eligibleTo,
      fileName: c.fileName,
      fileUrl: c.fileUrl,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }, [isOwner, ownerContracts.data, workerContracts.data]);

  const parties = useMemo<ContractParty[]>(() => {
    if (isOwner) {
      return owners
        .filter((o) => !!o.ownerUserId)
        .map((o) => ({
          id: o.ownerUserId,
          name: o.ownerName ?? o.ownerUserId.slice(0, 8),
          email: o.ownerEmail ?? "—",
        }));
    }
    return workers.map((w) => ({
      id: w.id,
      name: w.fullName ?? w.id.slice(0, 8),
      email: w.email ?? "—",
    }));
  }, [isOwner, owners, workers]);

  const createPerm = isOwner
    ? "owner_contract:create_any"
    : "worker_contract:create_any";
  const renewPerm = isOwner
    ? "owner_contract:renew_any"
    : "worker_contract:renew_any";
  const deactivatePerm = isOwner
    ? "owner_contract:deactivate_any"
    : "worker_contract:deactivate_any";

  const close = () => {
    setModal(null);
    createMut.reset();
    renewMut.reset();
    deactivateMut.reset();
  };

  function mapError(err: unknown): string {
    const code = getApiErrorCode(err);
    return code && KNOWN_ERRORS.has(code)
      ? t(`errors.${code}`)
      : t("errors.generic");
  }

  const formError =
    modal?.type === "create" && createMut.isError
      ? mapError(createMut.error)
      : modal?.type === "renew" && renewMut.isError
        ? mapError(renewMut.error)
        : null;

  const deactivateError = deactivateMut.isError
    ? mapError(deactivateMut.error)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Can permission={createPerm}>
          <Button className="gap-1.5" onClick={() => setModal({ type: "create" })}>
            <Plus className="size-4" />
            {t("new")}
          </Button>
        </Can>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ContractType)}>
        <TabsList variant="line" className="self-start">
          <TabsTrigger value="owner">{t("tabs.owner")}</TabsTrigger>
          <TabsTrigger value="worker">{t("tabs.worker")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {deactivateError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deactivateError}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {query.isLoading
              ? tCommon("loading")
              : tCommon("resultsFound", { count: rows.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.party")}</TableHead>
                <TableHead>{t("columns.period")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.file")}</TableHead>
                <TableHead>{t("columns.created")}</TableHead>
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-destructive"
                  >
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.contractId} className="hover:bg-accent/40">
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{r.partyName}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {r.partyEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(r.eligibleFrom, locale)} → {fmtDate(r.eligibleTo, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? "default" : "secondary"}>
                        {r.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:underline"
                      >
                        <FileText className="size-3.5" />
                        {t("viewFile")}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(r.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {r.isActive ? (
                          <Can permission={renewPerm}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={t("form.renew")}
                              onClick={() => setModal({ type: "renew", row: r })}
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                          </Can>
                        ) : null}
                        {r.isActive ? (
                          <Can permission={deactivatePerm}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive"
                              title={t("deactivate")}
                              onClick={() =>
                                setModal({ type: "deactivate", row: r })
                              }
                            >
                              <Ban className="size-4" />
                            </Button>
                          </Can>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modal?.type === "create" && (
        <ContractFormDialog
          open
          mode="create"
          onClose={close}
          parties={parties}
          pending={createMut.isPending}
          error={formError}
          onSubmit={(partyId, body: CreateContractRequest) => {
            if (isOwner) {
              createOwner.mutate(
                { ownerUserId: partyId, body },
                { onSuccess: close },
              );
            } else {
              createWorker.mutate(
                { workerId: partyId, body },
                { onSuccess: close },
              );
            }
          }}
        />
      )}

      {modal?.type === "renew" && (
        <ContractFormDialog
          open
          mode="renew"
          onClose={close}
          fixedParty={{ id: modal.row.partyId, name: modal.row.partyName }}
          pending={renewMut.isPending}
          error={formError}
          onSubmit={(partyId, body: CreateContractRequest) => {
            if (isOwner) {
              renewOwner.mutate(
                { ownerUserId: partyId, body },
                { onSuccess: close },
              );
            } else {
              renewWorker.mutate(
                { workerId: partyId, body },
                { onSuccess: close },
              );
            }
          }}
        />
      )}

      {modal?.type === "deactivate" && (
        <ConfirmDialog
          open
          onClose={close}
          isPending={deactivateMut.isPending}
          title={t("deactivateTitle")}
          description={t("deactivateConfirm", { name: modal.row.partyName })}
          confirmLabel={t("deactivate")}
          destructive
          onConfirm={() =>
            deactivateMut.mutate(modal.row.contractId, { onSuccess: close })
          }
        />
      )}
    </div>
  );
}
