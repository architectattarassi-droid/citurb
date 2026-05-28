import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

// Kernel
import { HealthModule } from "./modules/health/health.module";
import { KernelModule } from "./modules/kernel/kernel.module";
import { ArchiveModule } from "./modules/archive/archive.module";
import { CerclesModule } from "./modules/cercles/cercles.module";
import { AdminModule } from "./admin/admin.module";
import { TwilioModule } from "./modules/twilio/twilio.module";
import { EmailModule } from "./modules/email/email.module";
import { NotificationsHubModule } from "./modules/notifications-hub/notifications-hub.module";

// Infra
import { PrismaDossiersModule } from "./tomes/tome-at/kernel/prisma-dossiers/prisma-dossiers.module";

// Modules
import { UniverseModule } from "./modules/universe/universe.module";
import { CCModule } from "./command-center/cc.module";

// Tome modules
import { TomeAtModule } from "./tomes/tome-at/tome-at.module";
import { Tome0Module } from "./tomes/tome-0/tome-0.module";
import { Tome1Module } from "./tomes/tome-1/tome-1.module";
import { Tome2Module } from "./tomes/tome-2/tome-2.module";
import { RokhasModule } from "./tomes/tome-2/p2/rokhas.module";
import { Tome3Module } from "./tomes/tome-3/tome-3.module";
import { Tome4Module } from "./tomes/tome-4/tome-4.module";
import { Tome5Module } from "./tomes/tome-5/tome-5.module";
import { Tome6Module } from "./tomes/tome-6/tome-6.module";
import { Tome7Module } from "./tomes/tome-7/tome-7.module";
import { Tome8Module } from "./tomes/tome-8/tome-8.module";
import { Tome9Module } from "./tomes/tome-9/tome-9.module";
import { Tome10FinancingModule } from "./tomes/tome-10/tome-10.module";

// App-level orchestration
import { OrchestratorModule } from "./orchestrator/orchestrator.module";
import { FirmModule } from "./modules/firm/firm.module";
import { StorageModule } from "./modules/storage/storage.module";
import { GeoModule } from "./modules/geo/geo.module";
import { SigModule } from "./modules/sig/sig.module";
import { PhaseEngineModule } from "./modules/phase-engine/phase-engine.module";
import { MessagerieModule } from "./modules/messagerie/messagerie.module";
import { SousPhaseModule } from "./modules/sous-phase/sous-phase.module";
import { SousTraitantsModule } from "./modules/sous-traitants/sous-traitants.module";
import { LivraisonsMateriauxModule } from "./modules/livraisons-materiaux/livraisons-materiaux.module";

// Phase 5 modules (parcours complet lead → use permit)
import { LeadFunnelModule } from "./modules/lead-funnel/lead-funnel.module";
import { DossierOverviewModule } from "./modules/dossier-overview/dossier-overview.module";
import { DocumentsRepoModule } from "./modules/documents-repo/documents-repo.module";
import { PermisConstruireModule } from "./modules/permis-construire/permis-construire.module";
import { RokhasTrackerModule } from "./modules/rokhas-tracker/rokhas-tracker.module";
import { ReceptionConformiteModule } from "./modules/reception-conformite/reception-conformite.module";
import { IncidentsChantierModule } from "./modules/incidents-chantier/incidents-chantier.module";
import { ZillowMaModule } from "./modules/zillow-ma/zillow-ma.module";
import { MreDiasporaModule } from "./modules/mre-diaspora/mre-diaspora.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HealthModule,
    KernelModule, // doit venir tôt: enregistre GlobalExceptionFilter via APP_FILTER + IncidentsService/ProbativeLogService
    PrismaDossiersModule,
    TwilioModule, // global — disponible partout
    EmailModule, // global — Resend (prioritaire) + SMTP fallback
    NotificationsHubModule, // global — dispatch multi-canal centralisé (email/sms/wa/push/in-app)
    CCModule,
    ArchiveModule,
    CerclesModule,
    AdminModule,

    // ── Tomes (@ → 0 → 1 → … → 10)
    TomeAtModule,
    OrchestratorModule,
    Tome0Module,
    Tome1Module,
    Tome2Module,
    RokhasModule,
    Tome3Module,
    Tome4Module,
    Tome5Module,
    Tome6Module,
    Tome7Module,
    Tome8Module,
    Tome9Module,
    Tome10FinancingModule,

    // Non-tome modules
    UniverseModule,
    FirmModule,
    StorageModule,
    GeoModule,
    SigModule,
    PhaseEngineModule,
    MessagerieModule,
    SousPhaseModule,
    SousTraitantsModule,
    LivraisonsMateriauxModule,

    // Phase 5 (parcours complet lead → manage → permit → site → delivery)
    LeadFunnelModule,
    DossierOverviewModule,
    DocumentsRepoModule,
    PermisConstruireModule,
    RokhasTrackerModule,
    ReceptionConformiteModule,
    IncidentsChantierModule,
    ZillowMaModule,
    MreDiasporaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
