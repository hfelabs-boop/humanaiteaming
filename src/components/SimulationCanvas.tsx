import React, { useRef, useEffect, useCallback } from 'react';
import { AppMode, Entity, EntityState, EntityType, GameConfig, Point } from '../types';
import { COLORS, CONFIG as STATIC_CONFIG } from '../constants';

interface SimulationCanvasProps {
  mode: AppMode;
  config: GameConfig;
  onStatUpdate: (type: 'hit' | 'miss', agent: 'human' | 'ai', detectionTime?: number, neutralizationTime?: number, reason?: MissReason) => void;
  width: number;
  height: number;
  paused: boolean;
}

export type MissReason = 'expired' | 'wrong';

interface Agent {
  id: number;
  x: number;
  y: number;
  targetId: string | null;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ mode, config, onStatUpdate, width, height, paused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  
  // Update ref when prop changes
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  
  // Mutable game state
  const entities = useRef<Entity[]>([]);
  const mousePos = useRef<Point>({ x: 0, y: 0 });
  const virtualCursorPos = useRef<Point>({ x: 0, y: 0 }); // Used for drawing and hit detection with magnet
  
  // Multi-Agent State
  const aiAgents = useRef<Agent[]>([]);
  
  // Teaming Mode Selection State
  const selectedTargetId = useRef<string | null>(null);

  const lastTime = useRef<number>(0);
  
  // Helper to generate random lifespan
  const getRandomLifespan = () => config.minLifespan + Math.random() * (config.maxLifespan - config.minLifespan);

  // Initialize Agents based on Config
  useEffect(() => {
    const needed = config.aiAgentCount;
    // Resize agent array
    if (aiAgents.current.length < needed) {
      for (let i = aiAgents.current.length; i < needed; i++) {
        aiAgents.current.push({
          id: i,
          x: width / 2,
          y: height / 2,
          targetId: null
        });
      }
    } else if (aiAgents.current.length > needed) {
      aiAgents.current = aiAgents.current.slice(0, needed);
    }
  }, [config.aiAgentCount, width, height]);

  // Input Handling: Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === AppMode.AI_AUTONOMY || mode === AppMode.TEAMING || paused) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // Input Handling: Keyboard (Teaming Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (mode !== AppMode.TEAMING || paused) return;
        const el = e.target as HTMLElement | null;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
        
        // --- TEAMING VERIFICATION LOGIC ---
        // Q = ODD, W = EVEN
        const key = e.key.toLowerCase();
        
        if ((key === 'q' || key === 'w') && selectedTargetId.current) {
            const targetIdx = entities.current.findIndex(t => t.id === selectedTargetId.current);
            if (targetIdx !== -1) {
                const target = entities.current[targetIdx];
                
                // Prevent spamming if already resolving
                if (target.feedback) return;

                const num = target.verificationNumber;
                
                if (num !== null) {
                    const isEven = num % 2 === 0;
                    let isCorrect = false;

                    if (key === 'w' && isEven) isCorrect = true;
                    if (key === 'q' && !isEven) isCorrect = true;

                    if (isCorrect) {
                        // Calculate Times
                        const now = performance.now();
                        const detectTime = target.timestampLock ? target.timestampLock - target.timestampSpawn : 0;
                        const neutTime = target.timestampLock ? now - target.timestampLock : 0;

                        onStatUpdate('hit', 'human', detectTime, neutTime);
                        
                        // Show Feedback: Correct
                        target.feedback = 'CORRECT';
                        target.feedbackTimer = 500; // 500ms duration
                    } else {
                        onStatUpdate('miss', 'human', undefined, undefined, 'wrong');
                        // Show Feedback: Error
                        target.feedback = 'ERROR';
                        target.feedbackTimer = 500;
                    }
                }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onStatUpdate, paused]);


  // Initialize or Re-balance Entities
  const rebalanceEntities = useCallback(() => {
    const currentCount = entities.current.length;
    if (currentCount < config.entityCount) {
      const needed = config.entityCount - currentCount;
      for (let i = 0; i < needed; i++) {
        entities.current.push(createEntity(true)); 
      }
    } else if (currentCount > config.entityCount) {
      entities.current = entities.current.slice(0, config.entityCount);
    }
  }, [config.entityCount, width, height]);

  const createEntity = (immediate = false): Entity => {
    const isTarget = Math.random() > 0.7;
    let type = EntityType.TARGET_PRIMARY;
    
    if (!isTarget) {
      const rand = Math.random();
      if (rand < 0.33) type = EntityType.DISTRACTOR_A;
      else if (rand < 0.66) type = EntityType.DISTRACTOR_B;
      else type = EntityType.DISTRACTOR_C;
    }

    const lifespan = getRandomLifespan();

    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * STATIC_CONFIG.SPEED_MAX,
      vy: (Math.random() - 0.5) * STATIC_CONFIG.SPEED_MAX,
      radius: STATIC_CONFIG.ENTITY_RADIUS,
      state: immediate ? EntityState.IDLE : EntityState.SPAWNING,
      dwellProgress: 0,
      lifespan: lifespan,
      maxLifespan: lifespan,
      spawnDelay: immediate ? 0 : config.spawnInterval,
      verificationNumber: null,
      feedback: null,
      feedbackTimer: 0,
      timestampSpawn: performance.now(),
      timestampLock: null
    };
  };

  useEffect(() => {
    rebalanceEntities();
  }, [config.entityCount, rebalanceEntities]);

  // Manual Click (only for MANUAL mode now)
  const handleClick = () => {
    if (mode !== AppMode.MANUAL || paused) return;

    // Manual click detection uses VIRTUAL cursor position (Magnet corrected)
    const cursor = virtualCursorPos.current;
    const targetIndex = entities.current.findIndex(e => {
        if (e.state === EntityState.SPAWNING) return false;
        const dx = e.x - cursor.x;
        const dy = e.y - cursor.y;
        return Math.sqrt(dx * dx + dy * dy) < e.radius * 1.5;
    });

    if (targetIndex !== -1) {
        const entity = entities.current[targetIndex];
        if (entity.state === EntityState.LOCKED && entity.type === EntityType.TARGET_PRIMARY) {
            
            const now = performance.now();
            const detectTime = entity.timestampLock ? entity.timestampLock - entity.timestampSpawn : 0;
            const neutTime = entity.timestampLock ? now - entity.timestampLock : 0;

            onStatUpdate('hit', 'human', detectTime, neutTime);
            respawnEntity(targetIndex);
        }
    }
  };

  const respawnEntity = (index: number) => {
    const oldId = entities.current[index].id;
    entities.current[index] = createEntity(false);
    
    // Clear agent references
    aiAgents.current.forEach(agent => {
        if (agent.targetId === oldId) agent.targetId = null; 
    });
    
    // Clear selection if needed
    if (selectedTargetId.current === oldId) selectedTargetId.current = null;
  };

  // The Game Loop
  const update = useCallback((time: number) => {
    if (pausedRef.current) {
        lastTime.current = time; // Update time so resume doesn't jump
        requestRef.current = requestAnimationFrame(() => update(performance.now()));
        return;
    }

    const deltaTime = time - lastTime.current;
    lastTime.current = time;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
        requestRef.current = requestAnimationFrame(() => update(performance.now()));
        return;
    }

    // 1. Clear
    ctx.clearRect(0, 0, width, height);

    // 2. Logic Params
    // CRITICAL UPDATE: AI controls during Recovery (Handshake) as well
    const isAiControlling = mode === AppMode.AI_AUTONOMY || mode === AppMode.TEAMING || mode === AppMode.TRANSITION_RECOVERY;

    // ---------------- MAGNET ASSIST LOGIC ----------------
    let targetX = mousePos.current.x;
    let targetY = mousePos.current.y;

    if (mode === AppMode.MANUAL && config.magnetAssist) {
        let closestDist = STATIC_CONFIG.MAGNET_RADIUS;
        let snapTarget: Entity | null = null;

        entities.current.forEach(e => {
            if (e.type === EntityType.TARGET_PRIMARY && e.state !== EntityState.SPAWNING) {
                const dx = e.x - targetX;
                const dy = e.y - targetY;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < closestDist) {
                    closestDist = d;
                    snapTarget = e;
                }
            }
        });

        if (snapTarget) {
            targetX = (snapTarget as Entity).x;
            targetY = (snapTarget as Entity).y;
        }
    }

    // Lerp Virtual Cursor to target position (Smooth Magnetism)
    virtualCursorPos.current.x += (targetX - virtualCursorPos.current.x) * 0.4;
    virtualCursorPos.current.y += (targetY - virtualCursorPos.current.y) * 0.4;

    // ---------------- AI LOGIC (MULTI-AGENT) ----------------
    if (isAiControlling) {
      const claimedIds = new Set(aiAgents.current.map(a => a.targetId).filter(id => id !== null));

      aiAgents.current.forEach(agent => {
        // A. Validate current target
        let target = entities.current.find(e => e.id === agent.targetId && e.state !== EntityState.SPAWNING);
        
        // If lost target or target is invalid type, clear it
        if (!target || target.type !== EntityType.TARGET_PRIMARY) {
            agent.targetId = null;
            target = undefined;
        }

        // B. Behavior Logic
        // In TEAMING: Ignore already LOCKED targets (AI's job is to finding IDLE ones)
        // In AUTONOMY/RECOVERY: Stay on LOCKED targets to kill them.
        if (mode === AppMode.TEAMING && target && target.state === EntityState.LOCKED) {
             agent.targetId = null; // Serial Processing: Move to next immediately
             target = undefined;
        }

        // C. Find new target if needed
        if (!target) {
            const candidates = entities.current.filter(e => {
                if (e.type !== EntityType.TARGET_PRIMARY) return false;
                if (e.state === EntityState.SPAWNING) return false;
                if (claimedIds.has(e.id)) return false;
                
                // Exclude targets that are already being processed (feedback active)
                if (e.feedback) return false;

                if (mode === AppMode.TEAMING) {
                    // Teaming: AI looks for IDLE/DWELLING to upgrade them to LOCKED
                    return e.state !== EntityState.LOCKED; 
                } else {
                    // Autonomy/Recovery: AI looks for anything alive
                    return true;
                }
            });

            if (candidates.length > 0) {
                // Find closest
                let minDist = Infinity;
                let closest = null;
                candidates.forEach(t => {
                    const dx = t.x - agent.x;
                    const dy = t.y - agent.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < minDist) {
                        minDist = d;
                        closest = t;
                    }
                });

                if (closest) {
                    agent.targetId = (closest as Entity).id;
                    target = closest;
                    claimedIds.add(agent.targetId); 
                }
            }
        }

        // D. Move Agent
        if (target) {
            const dx = target.x - agent.x;
            const dy = target.y - agent.y;
            agent.x += dx * STATIC_CONFIG.AI_CURSOR_SPEED;
            agent.y += dy * STATIC_CONFIG.AI_CURSOR_SPEED;

            // Auto-Click (ONLY IN FULL AUTONOMY or RECOVERY)
            if ((mode === AppMode.AI_AUTONOMY || mode === AppMode.TRANSITION_RECOVERY) && target.state === EntityState.LOCKED) {
                if (Math.random() > 0.9) {
                    const idx = entities.current.findIndex(e => e.id === target?.id);
                    if (idx !== -1) {
                        const t = entities.current[idx];
                        const now = performance.now();
                        const neutTime = now - t.timestampSpawn; // AI is fast, count from spawn

                        onStatUpdate('hit', 'ai', 0, neutTime);
                        respawnEntity(idx);
                        agent.targetId = null; 
                    }
                }
            }
        } else {
            // Idle movement if no targets
            // Float around center slightly
            const targetX = (width/2) + Math.sin(time / 1000 + agent.id) * 100;
            const targetY = (height/2) + Math.cos(time / 1000 + agent.id) * 100;
            agent.x += (targetX - agent.x) * 0.02;
            agent.y += (targetY - agent.y) * 0.02;
        }
      });
    } else {
        // Manual mode: Park agents
        aiAgents.current.forEach(agent => {
            agent.x = virtualCursorPos.current.x;
            agent.y = virtualCursorPos.current.y;
            agent.targetId = null;
        });
    }

    // ---------------- TEAMING AUTO SELECTION LOGIC ----------------
    if (mode === AppMode.TEAMING) {
        // 1. Check if current selection is valid
        const currentSelection = entities.current.find(e => e.id === selectedTargetId.current);
        // Valid if: exists, is LOCKED, is TARGET. 
        // We allow 'ERROR' feedback to persist so we don't switch targets on mistake.
        // We only consider it invalid if it's 'CORRECT' (being removed) or null/undefined.
        const isSelectionValid = currentSelection && 
                                 currentSelection.state === EntityState.LOCKED && 
                                 currentSelection.type === EntityType.TARGET_PRIMARY &&
                                 (currentSelection.feedback === null || currentSelection.feedback === 'ERROR');
        
        // 2. If invalid or null, pick a random LOCKED target that isn't resolving
        if (!isSelectionValid) {
            const lockedTargets = entities.current.filter(e => 
                e.state === EntityState.LOCKED && 
                e.type === EntityType.TARGET_PRIMARY &&
                !e.feedback
            );

            if (lockedTargets.length > 0) {
                const randIndex = Math.floor(Math.random() * lockedTargets.length);
                selectedTargetId.current = lockedTargets[randIndex].id;
            } else {
                selectedTargetId.current = null;
            }
        }
    } else {
        selectedTargetId.current = null;
    }

    // ---------------- ENTITY LOOP ----------------
    entities.current.forEach((entity, index) => {
      // Feedback Animation Logic
      if (entity.feedback) {
          entity.feedbackTimer -= deltaTime;
          if (entity.feedbackTimer <= 0) {
              if (entity.feedback === 'CORRECT') {
                  respawnEntity(index);
                  return; // Stop processing this entity (it's gone)
              } else {
                  // Error finished
                  entity.feedback = null;
              }
          }
      }

      // SPAWNING Logic
      if (entity.state === EntityState.SPAWNING) {
        entity.spawnDelay -= deltaTime;
        if (entity.spawnDelay <= 0) {
          entity.state = EntityState.IDLE;
          entity.timestampSpawn = performance.now(); // Measure detection from first appearance
        } else {
          return;
        }
      }

      // Physics
      entity.x += entity.vx;
      entity.y += entity.vy;
      if (entity.x < 0 || entity.x > width) entity.vx *= -1;
      if (entity.y < 0 || entity.y > height) entity.vy *= -1;

      // Interaction Check
      let isHovered = false;
      
      if (isAiControlling) {
          isHovered = aiAgents.current.some(agent => {
             const dx = agent.x - entity.x;
             const dy = agent.y - entity.y;
             return Math.sqrt(dx * dx + dy * dy) < entity.radius * 2;
          });
      } else {
          // Manual Hover Check using Virtual Cursor
          const dx = virtualCursorPos.current.x - entity.x;
          const dy = virtualCursorPos.current.y - entity.y;
          isHovered = Math.sqrt(dx * dx + dy * dy) < entity.radius * 2;
      }

      // Dwell Logic
      if (isHovered && entity.type === EntityType.TARGET_PRIMARY) {
        if (entity.state !== EntityState.LOCKED) {
          entity.state = EntityState.DWELLING;
          entity.dwellProgress += deltaTime / STATIC_CONFIG.DWELL_TIME_MS;
          
          if (entity.dwellProgress >= 1) {
            entity.dwellProgress = 1;
            entity.state = EntityState.LOCKED; // BECOMES DETECTED
            entity.timestampLock = performance.now(); // Record Lock Time
            // Assign Verification Number for Cognitive Task
            entity.verificationNumber = Math.floor(Math.random() * 100) + 1;
          }
        }
      } else {
        if (entity.state === EntityState.DWELLING) {
           entity.dwellProgress = Math.max(0, entity.dwellProgress - (deltaTime / 500));
           if (entity.dwellProgress === 0) entity.state = EntityState.IDLE;
        }
      }
      
      // Lifespan Logic
      // RULE: If target is DETECTED (LOCKED), it will not disappear (infinite lifespan).
      if (entity.state !== EntityState.LOCKED) {
         entity.lifespan -= deltaTime;
         if (entity.lifespan <= 0) {
            if (entity.type === EntityType.TARGET_PRIMARY) {
               const responsibleAgent = mode === AppMode.AI_AUTONOMY ? 'ai' : 'human';
               onStatUpdate('miss', responsibleAgent, undefined, undefined, 'expired');
            }
            respawnEntity(index);
            return; 
         }
      }

      // ---------------- RENDER ENTITY ----------------
      ctx.save();
      
      // Apply Shake if Error
      let renderX = entity.x;
      let renderY = entity.y;
      if (entity.feedback === 'ERROR') {
          const shakeAmount = 5;
          renderX += Math.sin(time * 0.1) * shakeAmount;
      }
      
      ctx.translate(renderX, renderY);

      // Fade in/out (Ignore fade if LOCKED)
      let opacity = 1;
      if (entity.state !== EntityState.LOCKED) {
         if (entity.lifespan < 1000) opacity = entity.lifespan / 1000;
         if (entity.maxLifespan - entity.lifespan < 500) opacity = (entity.maxLifespan - entity.lifespan) / 500;
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

      // Dwell Ring
      if (entity.dwellProgress > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius + 8, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * entity.dwellProgress));
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // LOCKED / DETECTED INDICATOR
      if (entity.state === EntityState.LOCKED) {
        // AI has found it - Circle around target (Changed from Rect)
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius + 8, 0, Math.PI * 2);
        
        // Change color based on feedback
        if (entity.feedback === 'CORRECT') ctx.strokeStyle = '#22c55e'; // Green
        else if (entity.feedback === 'ERROR') ctx.strokeStyle = '#ef4444'; // Red
        else ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)'; // Default Green

        ctx.lineWidth = 2;
        ctx.stroke();

        if (mode === AppMode.TEAMING && entity.verificationNumber !== null) {
            // RENDER NUMBER FOR TASK
            // Background plate for readability
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.arc(0, 0, entity.radius - 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px monospace'; // Larger font
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Simple Shadow
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(entity.verificationNumber.toString(), 0, 1);
        } else {
            // Normal Manual/Auto Label
            ctx.fillStyle = '#22c55e';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("DETECTED", 0, -entity.radius - 12);
        }
      }

      // FEEDBACK OVERLAYS
      if (entity.feedback === 'CORRECT') {
          // Green V Check
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(-15, 0);
          ctx.lineTo(-5, 15);
          ctx.lineTo(20, -15);
          ctx.stroke();
      } else if (entity.feedback === 'ERROR') {
          // ERROR Text
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("ERROR", 0, entity.radius + 20);
      }

      // USER SELECTION (TEAMING MODE)
      if (mode === AppMode.TEAMING && selectedTargetId.current === entity.id) {
         // Highlighting - Gap Crosshair to not obscure number
         ctx.beginPath();
         const gap = 16;
         const len = entity.radius * 2.5;
         
         ctx.moveTo(0, -len); ctx.lineTo(0, -gap);
         ctx.moveTo(0, gap); ctx.lineTo(0, len);
         ctx.moveTo(-len, 0); ctx.lineTo(-gap, 0);
         ctx.moveTo(gap, 0); ctx.lineTo(len, 0);

         // Use Configured Crosshair Color (Default Green) unless Error
         ctx.strokeStyle = entity.feedback === 'ERROR' ? '#ef4444' : config.teamingCrosshairColor;
         ctx.lineWidth = 2;
         ctx.stroke();

         // Outer Spin Ring
         ctx.beginPath();
         ctx.arc(0, 0, entity.radius + 15, time / 200, time / 200 + Math.PI);
         ctx.strokeStyle = entity.feedback === 'ERROR' ? '#ef4444' : config.teamingCrosshairColor;
         ctx.stroke();
         
         // Only show prompt if not in feedback state
         if (!entity.feedback) {
             ctx.fillStyle = config.teamingCrosshairColor;
             ctx.font = '10px monospace';
             ctx.fillText("[Q] ODD  [W] EVEN", 0, entity.radius + 28);
         }
      }

      // Main Body
      // Only draw body if NOT in teaming mode locked state (to show number clearly)
      // OR if it is teaming mode, draw it with low opacity behind number
      const isAiTracked = isAiControlling && aiAgents.current.some(a => a.targetId === entity.id);
      
      if (mode === AppMode.TEAMING && entity.state === EntityState.LOCKED) {
         // In Teaming Locked, we rely on the black background plate and number drawn above
         // Just draw a thin ring to keep the color id
          ctx.strokeStyle = isAiTracked ? config.aiTargetColor : COLORS[entity.type];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
          ctx.stroke();
      } else {
          ctx.fillStyle = isAiTracked ? config.aiTargetColor : COLORS[entity.type];
          ctx.beginPath();
          ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
          ctx.fill();
      }
      
      if (entity.type === EntityType.TARGET_PRIMARY && mode !== AppMode.TEAMING) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.restore();
    });

    // ---------------- DRAW CURSORS ----------------
    if (!isAiControlling) {
       // Manual Cursor (Render the VIRTUAL cursor which is magnet-corrected)
       const manualCursorX = virtualCursorPos.current.x;
       const manualCursorY = virtualCursorPos.current.y;
       
       // Draw Magnet Guide if active
       if (config.magnetAssist && (Math.abs(manualCursorX - mousePos.current.x) > 1 || Math.abs(manualCursorY - mousePos.current.y) > 1)) {
          ctx.beginPath();
          ctx.moveTo(mousePos.current.x, mousePos.current.y);
          ctx.lineTo(manualCursorX, manualCursorY);
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
       }

       ctx.beginPath();
       ctx.arc(manualCursorX, manualCursorY, 4, 0, Math.PI * 2);
       ctx.fillStyle = config.magnetAssist ? 'cyan' : 'white';
       ctx.fill();
       ctx.strokeStyle = 'black';
       ctx.stroke();

       if (config.magnetAssist) {
           ctx.beginPath();
           ctx.arc(manualCursorX, manualCursorY, 12, 0, Math.PI * 2);
           ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
           ctx.lineWidth = 1;
           ctx.stroke();
       }
    } else {
      // Render AI Agents
      aiAgents.current.forEach((agent, i) => {
          ctx.save();
          ctx.translate(agent.x, agent.y);
          
          if (mode === AppMode.TEAMING) {
              // Teaming Scanner Look (MAGENTA CROSSHAIR ONLY - NO SPIRAL)
              const magenta = '#d946ef';
              ctx.strokeStyle = magenta;
              ctx.lineWidth = 2;

              // Crosshair
              ctx.beginPath();
              ctx.moveTo(0, -20); ctx.lineTo(0, 20);
              ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
              ctx.stroke();
              
              ctx.fillStyle = magenta; 
              ctx.font = '9px monospace';
              ctx.fillText(`SENTINEL ${i+1}`, 15, -15);
          } else {
              // Autonomy Killer Look
              ctx.strokeStyle = COLORS.AI_CURSOR;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
              ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
              ctx.stroke();

              ctx.fillStyle = COLORS.AI_CURSOR;
              ctx.font = '9px monospace';
              ctx.fillText(`AI ${i+1}`, 15, -15);
          }
          ctx.restore();
      });
    }

    requestRef.current = requestAnimationFrame(() => update(performance.now()));
  }, [mode, config, onStatUpdate, width, height]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(() => update(performance.now()));
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      className={`block bg-slate-900 border-2 ${mode === AppMode.AI_AUTONOMY || mode === AppMode.TEAMING || mode === AppMode.TRANSITION_RECOVERY ? 'cursor-none border-red-500/50' : 'cursor-crosshair border-slate-700'}`}
    />
  );
};

export default SimulationCanvas;
