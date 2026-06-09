"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { professionService } from "@/lib/services/profession.service";
import type {
  CreateProfessionRequest,
  UpdateProfessionRequest,
} from "@/lib/types/profession.types";

export function useProfessions() {
  return useQuery({
    queryKey: ["professions"],
    queryFn: () => professionService.list(),
  });
}

function useInvalidateProfessions() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["professions"] });
}

export function useCreateProfession() {
  const invalidate = useInvalidateProfessions();
  return useMutation({
    mutationFn: (body: CreateProfessionRequest) =>
      professionService.create(body),
    onSuccess: invalidate,
  });
}

export function useUpdateProfession() {
  const invalidate = useInvalidateProfessions();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProfessionRequest }) =>
      professionService.update(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteProfession() {
  const invalidate = useInvalidateProfessions();
  return useMutation({
    mutationFn: (id: string) => professionService.remove(id),
    onSuccess: invalidate,
  });
}
