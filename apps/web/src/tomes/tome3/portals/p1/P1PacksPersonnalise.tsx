// apps/web/src/tomes/tome3/portals/p1/P1PacksPersonnalise.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readP1Draft, resolveUserId } from '../../../../application/p1/startQualification';
import { writeJSON } from '../../../../infrastructure/storage';

interface ProjectData {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  type: string;
  region: string;
  province: string;
  commune: string;
  area?: string;
  budget?: string;
  timeline?: string;
}

export default function P1PacksPersonnalise() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [recommendedPack, setRecommendedPack] = useState<any>(null);
  const [showAllPacks, setShowAllPacks] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Charger données projet
    const data = readP1Draft(resolveUserId(null)) as any;
    if (data && Object.keys(data).length) {
      try {
        // data already parsed
        
        // VALIDATION STRICTE - tous les champs requis
        const requiredFields = ['firstname', 'lastname', 'email', 'phone', 'type', 'region', 'province', 'commune', 'timeline'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
          alert(`⚠️ Données projet incomplètes. Champs manquants: ${missingFields.join(', ')}\n\nVeuillez compléter votre projet.`);
          navigate('/p1/qualify');
          return;
        }
        
        // Validation type-specific
        if (data.type !== 'renovation') {
          if (!data.area || !data.budget) {
            alert('⚠️ Veuillez renseigner la surface et le budget de votre projet.');
            navigate('/p1/qualify');
            return;
          }
        }
        
        setProjectData(data);
        setRecommendedPack(calculateRecommendedPack(data));
      } catch (e) {
        alert('⚠️ Erreur lors du chargement des données projet.');
        navigate('/p1/qualify');
      }
    } else {
      // Pas de projet → rediriger
      alert('⚠️ Veuillez d\'abord qualifier votre projet.');
      navigate('/p1/qualify');
    }
  }, [navigate]);

  const calculateRecommendedPack = (data: ProjectData) => {
    const packs = {
      entree: {
        id: 'entree',
        name: 'Pack Entrée',
        subtitle: 'Plan type + autorisation + suivi photos',
        basePrice: 19999,
        features: [
          'Plan gabarit standard',
          'Dossier autorisation',
          'Commission (jusqu\'à 3 cycles)',
          'Suivi chantier photos (quota)',
        ],
      },
      standard: {
        id: 'standard',
        name: 'Pack Standard',
        subtitle: 'Plan personnalisé + autorisation + suivi photos',
        basePrice: 39999,
        features: [
          'Plan sur-mesure',
          'Révisions C1/C2 incluses',
          'Esquisse personnalisée',
          'Autorisation + commission',
          'Suivi chantier photos renforcé',
        ],
      },
      premium: {
        id: 'premium',
        name: 'Pack Premium',
        subtitle: 'Plan personnalisé + suivi chantier complet',
        basePrice: 59999,
        features: [
          'Plan sur-mesure + suivi chantier',
          'Visites PV + jalons',
          'Esquisse + APS + APD',
          'Autorisation + commission',
          'Réception provisoire + définitive',
        ],
      },
    };

    let recommendedId = 'standard';
    
    if (data.budget === '< 300000') recommendedId = 'entree';
    if (data.budget === '> 1000000') recommendedId = 'premium';
    if (data.type === 'villa' && data.area && parseInt(data.area) > 400) recommendedId = 'premium';

    const pack = packs[recommendedId];
    const calculatedPrice = calculatePrice(pack.basePrice, data);

    return { ...pack, calculatedPrice };
  };

  const calculatePrice = (basePrice: number, data: ProjectData): number => {
    let price = basePrice;

    if (data.area && parseInt(data.area) > 300) price *= 1.2;
    if (data.type === 'immeuble') price *= 1.3;
    if (data.budget === '> 1000000') price *= 1.1;

    return Math.round(price);
  };

  const handleSelectPack = (packId: string) => {
    writeJSON('citurbarea:selected_pack:v1', packId);
    navigate('/p1/config');
  };

  if (!projectData) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement...</div>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(201,162,39,0.08), rgba(232,216,166,0.08))',
        padding: '48px 20px',
        borderBottom: '1px solid rgba(201,162,39,0.2)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#C9A227',
            letterSpacing: '0.1em',
            marginBottom: '12px',
          }}>
            OFFRES RÉSERVÉES MEMBRES — NON PUBLIQUES
          </div>
          <h1 style={{
            fontSize: '40px',
            fontWeight: 700,
            color: '#0B1B3A',
            margin: '0 0 16px',
          }}>
            Vos offres personnalisées
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'rgba(11,27,58,0.75)',
          }}>
            Ces offres s'affichent uniquement après qualification
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 20px' }}>
        {/* Récap projet */}
        <div style={{
          background: 'white',
          border: '2px solid #C9A227',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '48px',
          boxShadow: '0 4px 16px rgba(11,27,58,0.08)',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#0B1B3A',
            margin: '0 0 24px',
          }}>
            📊 Votre projet
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(11,27,58,0.68)', marginBottom: '6px' }}>
                TYPE
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0B1B3A' }}>
                {projectData.type}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(11,27,58,0.68)', marginBottom: '6px' }}>
                LOCALISATION
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0B1B3A' }}>
                {projectData.commune}, {projectData.province}
              </div>
            </div>

            {projectData.area && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(11,27,58,0.68)', marginBottom: '6px' }}>
                  SURFACE
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#0B1B3A' }}>
                  {projectData.area} m²
                </div>
              </div>
            )}

            {projectData.budget && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(11,27,58,0.68)', marginBottom: '6px' }}>
                  BUDGET
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#0B1B3A' }}>
                  {projectData.budget} MAD
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/p1/qualify')}
            style={{
              marginTop: '24px',
              padding: '10px 20px',
              background: 'transparent',
              color: '#C9A227',
              border: '1px solid rgba(201,162,39,0.3)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Modifier mon projet
          </button>
        </div>

        {/* Pack recommandé */}
        {recommendedPack && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(201,162,39,0.12), rgba(232,216,166,0.12))',
            border: '2px solid #C9A227',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '48px',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#C9A227',
              marginBottom: '12px',
              letterSpacing: '0.05em',
            }}>
              ⭐ PACK RECOMMANDÉ POUR VOTRE PROJET
            </div>

            <h2 style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#0B1B3A',
              margin: '0 0 8px',
            }}>
              {recommendedPack.name}
            </h2>

            <p style={{
              fontSize: '16px',
              color: 'rgba(11,27,58,0.75)',
              marginBottom: '24px',
            }}>
              {recommendedPack.subtitle}
            </p>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#0B1B3A',
              marginBottom: '24px',
            }}>
              {recommendedPack.calculatedPrice.toLocaleString()} MAD{' '}
              <span style={{ fontSize: '20px', fontWeight: 600 }}>HT</span>
            </div>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 32px',
            }}>
              {recommendedPack.features.map((feature, i) => (
                <li key={i} style={{
                  fontSize: '15px',
                  color: 'rgba(11,27,58,0.82)',
                  padding: '8px 0',
                  paddingLeft: '28px',
                  position: 'relative',
                }}>
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    color: '#C9A227',
                    fontWeight: 'bold',
                  }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => handleSelectPack(recommendedPack.id)}
                style={{
                  flex: 1,
                  padding: '18px',
                  background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sélectionner ce pack
              </button>

              <button
                onClick={() => setShowAllPacks(true)}
                style={{
                  padding: '18px 32px',
                  background: 'white',
                  color: '#0B1B3A',
                  border: '1px solid rgba(201,162,39,0.35)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Voir tous les packs
              </button>
            </div>

            <div style={{
              marginTop: '20px',
              fontSize: '13px',
              color: 'rgba(11,27,58,0.68)',
              textAlign: 'center',
            }}>
              Prix calculé automatiquement selon vos critères
            </div>
          </div>
        )}

        {/* Tous les packs (optionnel) */}
        {showAllPacks && (
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#0B1B3A',
              marginBottom: '32px',
              textAlign: 'center',
            }}>
              Tous les packs disponibles
            </h2>

            <style>{`
              @media (max-width: 1200px) {
                .packs-grid {
                  grid-template-columns: repeat(2, 1fr) !important;
                }
              }
              @media (max-width: 768px) {
                .packs-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>

            <div className="packs-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '32px',
              maxWidth: '1400px',
              margin: '0 auto',
            }}>
              {['entree', 'standard', 'premium'].map(packId => {
                const pack = calculateRecommendedPack({ ...projectData, budget: packId === 'entree' ? '< 300000' : packId === 'premium' ? '> 1000000' : '500000-1000000' });
                
                return (
                  <div
                    key={packId}
                    style={{
                      background: 'white',
                      border: pack.id === recommendedPack?.id ? '2px solid #C9A227' : '1px solid rgba(201,162,39,0.25)',
                      borderRadius: '16px',
                      padding: '36px',
                      minHeight: '500px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {pack.id === recommendedPack?.id && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        right: '20px',
                        background: 'linear-gradient(135deg, #C9A227, #E6C75B)',
                        color: 'white',
                        padding: '6px 16px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}>
                        RECOMMANDÉ
                      </div>
                    )}

                    <h3 style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#0B1B3A',
                      margin: '0 0 8px',
                    }}>
                      {pack.name}
                    </h3>

                    <p style={{
                      fontSize: '14px',
                      color: 'rgba(11,27,58,0.68)',
                      marginBottom: '20px',
                    }}>
                      {pack.subtitle}
                    </p>

                    <div style={{
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#0B1B3A',
                      marginBottom: '20px',
                    }}>
                      {pack.calculatedPrice.toLocaleString()} MAD{' '}
                      <span style={{ fontSize: '14px' }}>HT</span>
                    </div>

                    <button
                      onClick={() => handleSelectPack(pack.id)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        background: pack.id === recommendedPack?.id 
                          ? 'linear-gradient(135deg, #C9A227, #E6C75B)' 
                          : 'transparent',
                        color: pack.id === recommendedPack?.id ? 'white' : '#C9A227',
                        border: pack.id === recommendedPack?.id ? 'none' : '1px solid #C9A227',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Sélectionner
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{
              textAlign: 'center',
              marginTop: '40px',
            }}>
              <a
                href="/faq"
                style={{
                  color: '#C9A227',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Questions sur les méthodes de calcul, honoraires ? → Consulter la FAQ
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
