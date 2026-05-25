"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pv_chantier_service_1 = require("./pv-chantier.service");
/**
 * Test unitaire ciblé sur la numérotation auto et la sanitisation
 * des observations — sans monter le module Nest complet.
 *
 * NB: pour lancer ce spec en isolation: `npm --prefix apps/api test -- pv-chantier`.
 */
// Stubs minimaux Prisma + Probative
class PrismaStub {
    store = {};
    dossier = {
        findUnique: async ({ where: { id } }) => this.store[id]
            ? { id, ownerId: "u1", refInterne: null, payload: this.store[id] }
            : null,
        findMany: async () => Object.entries(this.store).map(([id, payload]) => ({
            id,
            ownerId: "u1",
            refInterne: null,
            payload,
        })),
        update: async ({ where: { id }, data }) => {
            this.store[id] = data.payload;
            return this.store[id];
        },
    };
}
class ProbativeStub {
    appended = [];
    async append(p) {
        this.appended.push(p);
        return { ok: true, hash: "hash-stub" };
    }
}
describe("PvChantierService", () => {
    const buildSvc = () => {
        const prisma = new PrismaStub();
        prisma.store["d1"] = {};
        const probative = new ProbativeStub();
        const svc = new pv_chantier_service_1.PvChantierService(prisma, probative);
        return { svc, prisma, probative };
    };
    it("crée un PV avec numéro YYYY-001 puis YYYY-002", async () => {
        const { svc } = buildSvc();
        const a = await svc.create("d1", "u1", { typeVisite: "AVANCEMENT" });
        const b = await svc.create("d1", "u1", { typeVisite: "AVANCEMENT" });
        expect(a.numero).toMatch(/-001$/);
        expect(b.numero).toMatch(/-002$/);
        expect(a.status).toBe("DRAFT");
        expect(b.dossierId).toBe("d1");
    });
    it("liste les PV triés par date DESC avec severiteMax calculé", async () => {
        const { svc } = buildSvc();
        await svc.create("d1", "u1", {
            date: "2026-01-10",
            observations: [
                {
                    id: "o1",
                    severite: "INFO",
                    titre: "T",
                    photoUrls: [],
                },
                {
                    id: "o2",
                    severite: "BLOQUANT",
                    titre: "T2",
                    photoUrls: [],
                },
            ],
        });
        await svc.create("d1", "u1", { date: "2026-02-10" });
        const list = await svc.list("d1");
        expect(list).toHaveLength(2);
        expect(list[0].date >= list[1].date).toBe(true);
        const withSev = list.find((p) => p.observationsCount === 2);
        expect(withSev.severiteMax).toBe("BLOQUANT");
    });
    it("refuse patch sur PV finalisé", async () => {
        const { svc } = buildSvc();
        const pv = await svc.create("d1", "u1", { typeVisite: "AVANCEMENT" });
        await svc.addSignature(pv.id, {
            partie: "test",
            dataUrl: "data:image/png;base64,AAAA",
        });
        await svc.finalize(pv.id, "<html></html>");
        await expect(svc.patch(pv.id, "u1", { meteo: "Pluie" })).rejects.toBeDefined();
    });
    it("ajoute une signature et bascule SIGNED_PARTIEL", async () => {
        const { svc } = buildSvc();
        const pv = await svc.create("d1", "u1", {});
        const signed = await svc.addSignature(pv.id, {
            partie: "Architecte",
            dataUrl: "data:image/png;base64,AAAA",
        });
        expect(signed.status).toBe("SIGNED_PARTIEL");
        expect(signed.signatures).toHaveLength(1);
    });
    it("finalize calcule hash + log probative", async () => {
        const { svc, probative } = buildSvc();
        const pv = await svc.create("d1", "u1", {});
        await svc.addSignature(pv.id, {
            partie: "X",
            dataUrl: "data:image/png;base64,AAAA",
        });
        const finalized = await svc.finalize(pv.id, "<html>final</html>");
        expect(finalized.status).toBe("FINAL");
        expect(finalized.hashSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(probative.appended).toHaveLength(1);
        expect(probative.appended[0].kind).toBe("PV_CHANTIER_FINALIZED");
    });
});
