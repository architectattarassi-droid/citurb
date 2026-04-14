// apps/web/src/tomes/tome3/portals/p1/components/Timeline.tsx

import React from 'react';

interface TimelineStep {
  id: number;
  label: string;
  duration: string;
  status: 'completed' | 'active' | 'pending';
  description: string;
}

interface Props {
  steps: TimelineStep[];
  currentStep: number;
}

export default function Timeline({ steps, currentStep }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isActive = step.status === 'active';
        const isPending = step.status === 'pending';

        return (
          <div
            key={step.id}
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: index < steps.length - 1 ? '32px' : 0,
              position: 'relative',
            }}
          >
            {/* Ligne verticale */}
            {index < steps.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '23px',
                top: '48px',
                width: '2px',
                height: 'calc(100% + 32px)',
                background: isCompleted 
                  ? 'linear-gradient(180deg, #10b981, rgba(16,185,129,0.3))' 
                  : 'rgba(201,162,39,0.2)',
              }} />
            )}

            {/* Cercle status */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: isCompleted 
                ? 'linear-gradient(135deg, #10b981, #34d399)' 
                : isActive 
                ? 'linear-gradient(135deg, #C9A227, #E6C75B)' 
                : 'rgba(201,162,39,0.1)',
              border: isPending ? '2px solid rgba(201,162,39,0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              color: isCompleted || isActive ? 'white' : 'rgba(11,27,58,0.4)',
              flexShrink: 0,
              zIndex: 1,
              position: 'relative',
            }}>
              {isCompleted ? '✓' : step.id}
            </div>

            {/* Contenu */}
            <div style={{ flex: 1, paddingBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: isActive ? '#C9A227' : '#0B1B3A',
                  margin: 0,
                }}>
                  {step.label}
                </h3>

                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(11,27,58,0.68)',
                  padding: '4px 10px',
                  background: 'rgba(201,162,39,0.08)',
                  borderRadius: '999px',
                }}>
                  {step.duration}
                </span>

                {isActive && (
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#C9A227',
                    padding: '4px 12px',
                    background: 'rgba(201,162,39,0.15)',
                    borderRadius: '999px',
                    letterSpacing: '0.05em',
                  }}>
                    EN COURS
                  </span>
                )}
              </div>

              <p style={{
                fontSize: '14px',
                color: 'rgba(11,27,58,0.75)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
