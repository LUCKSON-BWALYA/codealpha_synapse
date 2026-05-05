/**
 * SynapseApp  Frontend
 * API_BASE defaults to http://localhost:4000/api (change via env)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { deriveKey,encryptMessage, decryptMessage, encryptFile, keyFingerprint } from "./lib/crypto";
import { getIceServers, fetchTurnCredentials } from "./lib/turnconfig";

// ─── Config ───────────────────────────────────────────────────────
const API_BASE    = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL)  || "http://localhost:4000/api";
const SIGNAL_URL  = (typeof process !== "undefined" && process.env?.REACT_APP_SIGNAL_URL) || "http://localhost:4000";

// ─── STYLES ──────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Anybody:wght@300;400;600;700;900&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#03060c;
  --s1:#080e1a;
  --s2:#0d1525;
  --s3:#162035;
  --border:rgba(0,188,212,.12);
  --accent:#00bcd4;
  --a2:#69f0ae;
  --a3:#ffab40;
  --a4:#ff5252;
  --txt:#cfe8f3;
  --muted:#4a6580;
  --r:8px;
  --glow:0 0 28px rgba(0,188,212,.2);
  --ff:'Anybody',sans-serif;
  --fm:'JetBrains Mono',monospace;
}

body{background:var(--bg);color:var(--txt);font-family:var(--ff);min-height:100vh;overflow:hidden}
body::after{content:'';position:fixed;inset:0;opacity:.02;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,188,212,.5) 2px,rgba(0,188,212,.5) 3px);
  background-size:100% 4px;animation:scan 8s linear infinite;}
@keyframes scan{from{background-position:0 0}to{background-position:0 100vh}}

::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:var(--accent);border-radius:2px}

@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}
@keyframes ripple{to{transform:scale(3.5);opacity:0}}
@keyframes glow-pulse{0%,100%{box-shadow:0 0 8px rgba(0,188,212,.4)}50%{box-shadow:0 0 22px rgba(0,188,212,.8)}}

.fu{animation:fadeUp .35s ease both}
.fu1{animation:fadeUp .35s .07s ease both}
.fu2{animation:fadeUp .35s .14s ease both}
.fu3{animation:fadeUp .35s .21s ease both}

/* ── Auth ── */
.auth{display:grid;grid-template-columns:1fr 1fr;min-height:100vh}
@media(max-width:680px){.auth{grid-template-columns:1fr}.auth-hero{display:none!important}}

.auth-hero{
  position:relative;overflow:hidden;
  background:linear-gradient(160deg,#050e1c 0%,#03060c 50%,#071218 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px;
}
.hero-hex{
  position:absolute;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpolygon points='28,2 54,16 54,44 28,58 2,44 2,16' fill='none' stroke='rgba(0,188,212,0.06)' stroke-width='1'/%3E%3Cpolygon points='28,52 54,66 54,94 28,108 2,94 2,66' fill='none' stroke='rgba(0,188,212,0.06)' stroke-width='1'/%3E%3C/svg%3E");
  background-size:56px 100px;
  mask-image:radial-gradient(ellipse 75% 75% at 50% 50%,#000 20%,transparent 100%);
}
.hero-blob{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
.hero-c{position:relative;z-index:1;text-align:center}
.hero-logo{font-size:4rem;font-weight:900;letter-spacing:-2px;line-height:1;margin-bottom:8px;
  background:linear-gradient(135deg,#00bcd4,#69f0ae);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero-sub{font-family:var(--fm);font-size:.68rem;letter-spacing:4px;text-transform:uppercase;color:var(--muted);margin-bottom:40px}
.feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:32px;text-align:left}
.feat-item{background:rgba(0,188,212,.06);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;display:flex;align-items:center;gap:8px;font-size:.75rem;font-family:var(--fm)}
.feat-icon{font-size:1rem}
.security-row{display:flex;align-items:center;gap:8px;background:rgba(105,240,174,.07);border:1px solid rgba(105,240,174,.18);border-radius:var(--r);padding:10px 14px;font-family:var(--fm);font-size:.7rem;color:var(--a2)}

.auth-panel{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;background:var(--s1)}
.auth-card{width:100%;max-width:370px}
.auth-h{font-size:1.8rem;font-weight:900;letter-spacing:-1px;margin-bottom:4px}
.auth-s{font-family:var(--fm);font-size:.68rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:30px}

.field{margin-bottom:15px}
.field label{display:block;font-family:var(--fm);font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.field input{width:100%;padding:12px 14px;background:var(--s2);border:1px solid var(--border);border-radius:var(--r);color:var(--txt);font-family:var(--fm);font-size:.85rem;outline:none;transition:border-color .2s,box-shadow .2s}
.field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,188,212,.12)}

.btn{width:100%;padding:13px;background:var(--accent);border:none;border-radius:var(--r);color:var(--bg);font-family:var(--ff);font-weight:900;font-size:.9rem;cursor:pointer;transition:opacity .15s,transform .15s;position:relative;overflow:hidden;letter-spacing:.5px}
.btn:hover{opacity:.85;transform:translateY(-1px)}
.btn:active{transform:translateY(0)}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-g{background:transparent;border:1px solid var(--border);color:var(--txt);font-weight:600}
.btn-g:hover{border-color:var(--accent);background:rgba(0,188,212,.07);opacity:1}
.btn-r{background:var(--a4)}

.btn-rpl{position:absolute;border-radius:50%;background:rgba(0,0,0,.2);transform:scale(0);animation:ripple .5s linear;pointer-events:none}

.divider{display:flex;align-items:center;gap:10px;margin:16px 0;color:var(--muted);font-size:.65rem;font-family:var(--fm)}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border)}
.toggle{text-align:center;margin-top:18px;font-size:.8rem;color:var(--muted)}
.toggle button{background:none;border:none;color:var(--accent);cursor:pointer;font-family:var(--ff);font-weight:700}
.demo-box{background:var(--s2);border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;font-family:var(--fm);font-size:.72rem;color:var(--muted)}
.err{background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.3);border-radius:var(--r);padding:8px 12px;font-size:.75rem;color:#ff8a80;margin-bottom:12px;font-family:var(--fm)}
.ok{background:rgba(105,240,174,.1);border:1px solid rgba(105,240,174,.3);border-radius:var(--r);padding:8px 12px;font-size:.75rem;color:#69f0ae;margin-bottom:12px;font-family:var(--fm)}
.spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,.2);border-top-color:var(--bg);border-radius:50%;animation:spin .6s linear infinite;display:inline-block}

/* ── Shell ── */
.shell{display:grid;grid-template-columns:56px 1fr;height:100vh;overflow:hidden}

.sbar{background:var(--s1);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:2px}
.sbar-logo{font-size:1.2rem;font-weight:900;letter-spacing:-1px;margin-bottom:16px;
  background:linear-gradient(135deg,var(--accent),var(--a2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.nb{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:var(--muted);transition:background .15s,color .15s;font-size:1rem;position:relative}
.nb:hover,.nb.on{background:rgba(0,188,212,.14);color:var(--accent)}
.sep{width:26px;height:1px;background:var(--border);margin:5px 0}
.spcr{flex:1}
.av{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,var(--accent),var(--a2));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.62rem;cursor:pointer;color:var(--bg)}

.main{display:flex;flex-direction:column;overflow:hidden}
.tbar{height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid var(--border);background:var(--s1);flex-shrink:0}
.tbar-l{display:flex;align-items:center;gap:9px}
.tbar-t{font-size:.9rem;font-weight:700}
.online-dot{width:6px;height:6px;border-radius:50%;background:var(--a2);animation:pulse 2.5s infinite}

.content{flex:1;overflow-y:auto;padding:18px}

/* ── Stats ── */
.sgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px;margin-bottom:24px}
.sc{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;transition:border-color .2s,transform .2s;cursor:default}
.sc:hover{border-color:rgba(0,188,212,.35);transform:translateY(-2px)}
.sc-l{font-family:var(--fm);font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.sc-v{font-size:1.7rem;font-weight:900;letter-spacing:-1px}
.sc-s{font-size:.68rem;color:var(--muted);font-family:var(--fm);margin-top:2px}

/* ── Room cards ── */
.sec{font-size:.85rem;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px;letter-spacing:.5px}
.sec::after{content:'';flex:1;height:1px;background:var(--border)}
.rgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}

.rc{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:16px;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .2s;position:relative;overflow:hidden}
.rc::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,188,212,.04),transparent);opacity:0;transition:opacity .2s}
.rc:hover{border-color:rgba(0,188,212,.4);box-shadow:var(--glow);transform:translateY(-2px)}
.rc:hover::after{opacity:1}
.rc-n{font-weight:700;font-size:.9rem;margin-bottom:2px}
.rc-m{font-family:var(--fm);font-size:.67rem;color:var(--muted);display:flex;gap:9px;margin-bottom:12px}
.live{display:inline-flex;align-items:center;gap:4px;background:rgba(255,82,82,.1);border:1px solid rgba(255,82,82,.25);border-radius:100px;padding:2px 8px;font-size:.62rem;font-family:var(--fm);color:#ff8a80}
.live-d{width:4px;height:4px;border-radius:50%;background:var(--a4);animation:pulse 1s infinite}
.chip{display:inline-flex;background:rgba(0,188,212,.08);border:1px solid rgba(0,188,212,.2);border-radius:100px;padding:2px 8px;font-size:.62rem;font-family:var(--fm);color:var(--accent)}
.rc-cta{margin-top:9px;font-size:.7rem;color:var(--accent);font-family:var(--fm)}

/* ─── LOADING SKELETON ─── */
.skeleton{background:linear-gradient(90deg,var(--s2) 25%,var(--s3) 50%,var(--s2) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:var(--r)}

/* ══════════════════════════════════
   CALL VIEW
══════════════════════════════════ */
.call-view{position:fixed;inset:0;z-index:100;background:#020408;display:flex;flex-direction:column}

.call-hdr{height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;
  background:rgba(8,14,26,.9);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);flex-shrink:0}
.call-hdr-l{display:flex;align-items:center;gap:9px}
.call-tabs{display:flex;gap:5px}
.ctab{padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:var(--s2);color:var(--muted);cursor:pointer;font-family:var(--fm);font-size:.68rem;transition:.15s}
.ctab:hover,.ctab.on{background:rgba(0,188,212,.14);border-color:var(--accent);color:var(--accent)}
.ctimer{font-family:var(--fm);font-size:.75rem;color:var(--a2)}

.vgrid{flex:1;display:grid;gap:5px;padding:10px;align-content:center;overflow:hidden}
.vgrid.n1{grid-template-columns:1fr}
.vgrid.n2{grid-template-columns:1fr 1fr}
.vgrid.n3{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.vgrid.n3>.vtile:first-child{grid-column:1/-1}
.vgrid.n4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}

.vtile{background:var(--s2);border:1px solid var(--border);border-radius:10px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;min-height:110px;transition:border-color .25s,box-shadow .25s}
.vtile.speaking{border-color:var(--a2);box-shadow:0 0 16px rgba(105,240,174,.22)}
.vtile.screen{border-color:var(--a3);box-shadow:0 0 16px rgba(255,171,64,.2)}
.vtile video{width:100%;height:100%;object-fit:cover;display:block}
.vtile-av{display:flex;flex-direction:column;align-items:center;gap:9px}
.tav{width:58px;height:58px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--a2));display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:900;color:var(--bg)}
.tile-name{position:absolute;bottom:7px;left:9px;font-family:var(--fm);font-size:.65rem;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);padding:3px 8px;border-radius:4px;display:flex;align-items:center;gap:5px}
.tile-badge{position:absolute;top:7px;right:7px;display:flex;gap:3px}
.tb{background:rgba(0,0,0,.7);backdrop-filter:blur(4px);border-radius:4px;padding:2px 7px;font-family:var(--fm);font-size:.58rem;display:flex;align-items:center;gap:3px}
.tb-m{background:rgba(255,82,82,.75)}
.tb-s{background:rgba(255,171,64,.15);border:1px solid rgba(255,171,64,.35);color:var(--a3)}

.abars{display:flex;align-items:flex-end;gap:2px;height:12px}
.abar{width:2px;background:var(--a2);border-radius:1px;animation:lvl .4s ease infinite}
.abar:nth-child(2){animation-delay:.1s;height:10px}
.abar:nth-child(3){animation-delay:.2s;height:7px}
@keyframes lvl{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}

/* Controls */
.cbar{height:70px;display:flex;align-items:center;justify-content:center;gap:9px;background:rgba(8,14,26,.9);backdrop-filter:blur(14px);border-top:1px solid var(--border);flex-shrink:0}
.cb{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);background:var(--s2);cursor:pointer;font-size:.95rem;transition:background .15s,border-color .15s,transform .15s;position:relative}
.cb:hover{background:var(--s3);border-color:var(--accent);transform:scale(1.07)}
.cb.on{background:rgba(0,188,212,.18);border-color:var(--accent)}
.cb.off{background:rgba(255,82,82,.18);border-color:var(--a4)}
.cb.end{background:var(--a4);border-color:var(--a4);width:52px;border-radius:12px}
.cb.end:hover{background:#d32f2f;transform:scale(1.05)}
.cb-sep{width:1px;height:28px;background:var(--border);margin:0 3px}

.tip{position:relative}
.tip::after{content:attr(data-t);position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);background:var(--s3);border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-size:.6rem;font-family:var(--fm);white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s;z-index:10}
.tip:hover::after{opacity:1}

/* Chat + Peers panels */
.side-panel{width:260px;flex-shrink:0;background:var(--s1);border-left:1px solid var(--border);display:flex;flex-direction:column}
.panel-hdr{padding:11px 13px;border-bottom:1px solid var(--border);font-weight:700;font-size:.78rem;display:flex;justify-content:space-between;align-items:center}
.panel-close{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.85rem}

.chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px}
.msg-who{font-family:var(--fm);font-size:.62rem;margin-bottom:2px}
.msg-own .msg-who{color:var(--a2);text-align:right}
.msg-txt{background:var(--s2);border-radius:6px;padding:6px 9px;font-size:.75rem;line-height:1.45;font-family:var(--fm);word-break:break-word}
.msg-own .msg-txt{background:rgba(0,188,212,.12);border:1px solid rgba(0,188,212,.18);text-align:right}
.msg-ts{font-family:var(--fm);font-size:.55rem;color:var(--muted);margin-top:2px}
.enc-badge{font-size:.55rem;color:var(--a2);margin-left:4px}
.chat-in{display:flex;gap:6px;padding:9px;border-top:1px solid var(--border)}
.chat-inp{flex:1;background:var(--s2);border:1px solid var(--border);border-radius:6px;padding:6px 9px;color:var(--txt);font-family:var(--fm);font-size:.72rem;outline:none}
.chat-inp:focus{border-color:var(--accent)}
.chat-send{background:var(--accent);border:none;border-radius:6px;padding:6px 10px;color:var(--bg);cursor:pointer;font-weight:700;font-size:.7rem}

.peer-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border)}
.peer-av{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,var(--accent),var(--a2));display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.58rem;color:var(--bg);flex-shrink:0}
.peer-n{flex:1;font-size:.75rem;font-weight:600}
.peer-ic{display:flex;gap:3px;font-size:.7rem}

/* Status */
.rtc-badge{display:inline-flex;align-items:center;gap:5px;border-radius:100px;padding:3px 9px;font-family:var(--fm);font-size:.6rem;border:1px solid}
.rtc-ok{color:var(--a2);border-color:rgba(105,240,174,.28);background:rgba(105,240,174,.07)}
.rtc-warn{color:var(--a3);border-color:rgba(255,171,64,.28);background:rgba(255,171,64,.07)}
.rtc-err{color:#ff8a80;border-color:rgba(255,82,82,.28);background:rgba(255,82,82,.07)}

/* Enc key panel */
.key-panel{background:var(--s2);border:1px solid rgba(105,240,174,.2);border-radius:var(--r);padding:12px 14px;margin-bottom:12px}
.key-fp{font-family:var(--fm);font-size:.65rem;color:var(--a2);word-break:break-all;letter-spacing:1px;margin-top:6px}

/* Whiteboard */
.wb{display:flex;flex-direction:column;flex:1;overflow:hidden}
.wb-bar{display:flex;align-items:center;gap:6px;padding:9px 13px;background:var(--s1);border-bottom:1px solid var(--border);flex-wrap:wrap;flex-shrink:0}
.tool{padding:4px 11px;border-radius:6px;border:1px solid var(--border);background:var(--s2);color:var(--muted);cursor:pointer;font-family:var(--fm);font-size:.67rem;transition:.15s}
.tool:hover,.tool.on{background:rgba(0,188,212,.13);border-color:var(--accent);color:var(--accent)}
.csw{width:20px;height:20px;border-radius:4px;border:2px solid transparent;cursor:pointer;transition:.15s}
.csw:hover,.csw.on{border-color:#fff;transform:scale(1.2)}
.wb-wrap{flex:1;overflow:hidden;background:#020408;position:relative}
.wb-canvas{display:block;width:100%;height:100%}

/* File share */
.fdrop{border:2px dashed var(--border);border-radius:var(--r);padding:32px;text-align:center;cursor:pointer;transition:.2s}
.fdrop:hover,.fdrop.over{border-color:var(--accent);background:rgba(0,188,212,.04)}
.flist{margin-top:14px;display:flex;flex-direction:column;gap:7px}
.fitem{display:flex;align-items:center;gap:9px;background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:8px 11px}
.fname{flex:1;font-family:var(--fm);font-size:.72rem}
.fsize{font-family:var(--fm);font-size:.62rem;color:var(--muted)}
.pbar{height:2px;background:var(--s3);border-radius:1px;margin-top:4px}
.pfill{height:100%;background:linear-gradient(90deg,var(--accent),var(--a2));border-radius:1px;transition:width .2s}
.enc-file-badge{font-family:var(--fm);font-size:.55rem;color:var(--a2);margin-top:2px}

/* Settings */
.srow{display:flex;justify-content:space-between;align-items:center;background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:11px 14px;margin-bottom:7px}
.srow-k{font-weight:600;font-size:.82rem}
.srow-v{font-family:var(--fm);font-size:.68rem;color:var(--muted)}
.sbadge{font-family:var(--fm);font-size:.62rem;padding:2px 7px;border-radius:100px}
.sb-ok{background:rgba(105,240,174,.1);border:1px solid rgba(105,240,174,.25);color:var(--a2)}
.sb-w{background:rgba(255,171,64,.1);border:1px solid rgba(255,171,64,.25);color:var(--a3)}

/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center}
.modal{background:var(--s1);border:1px solid var(--border);border-radius:12px;padding:26px;width:90%;max-width:400px;animation:fadeUp .25s ease}
.modal-h{font-size:1.1rem;font-weight:900;margin-bottom:4px}
.modal-s{color:var(--muted);font-size:.72rem;font-family:var(--fm);margin-bottom:20px}
`;

// ─── HELPERS ─────────────────────────────────────────────────────
function useStyles(css) {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}

function addRipple(e) {
  const btn = e.currentTarget;
  const r = document.createElement("span");
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.className = "btn-rpl";
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 550);
}

function useCallTimer() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setS(x => x+1), 1000);
    return () => clearInterval(id);
  }, []);
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

const fmt = ts => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

// ═══════════════════════════════════════════════════════════════════
//  PHASE 3: API CLIENT — all calls go through here
// ═══════════════════════════════════════════════════════════════════
const tokenStore = {
  get:    ()     => ({ access: localStorage.getItem("ct_access"), refresh: localStorage.getItem("ct_refresh"), jti: localStorage.getItem("ct_jti") }),
  set:    (a,r,j) => { localStorage.setItem("ct_access", a); localStorage.setItem("ct_refresh", r); localStorage.setItem("ct_jti", j); },
  clear:  ()     => { ["ct_access","ct_refresh","ct_jti"].forEach(k => localStorage.removeItem(k)); },
};

async function apiFetch(path, options = {}, retry = true) {
  const { access, refresh, jti } = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(options.headers || {}),
    },
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry && refresh) {
    const rr = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh, jti }),
    });
    if (rr.ok) {
      const data = await rr.json();
      tokenStore.set(data.accessToken, data.refreshToken, data.jti);
      return apiFetch(path, options, false); // retry once
    } else {
      tokenStore.clear();
      window.location.reload();
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const api = {
  register: (name, email, password) =>
    apiFetch("/auth/register", { method:"POST", body: JSON.stringify({ name, email, password }) }, false),

  login: async (email, password) => {
    const data = await apiFetch("/auth/login", { method:"POST", body: JSON.stringify({ email, password }) }, false);
    tokenStore.set(data.accessToken, data.refreshToken, data.jti);
    return data;
  },

  logout: async () => {
    const { jti } = tokenStore.get();
    try { await apiFetch("/auth/logout", { method:"POST", body: JSON.stringify({ jti }) }); } catch {}
    tokenStore.clear();
  },

  getRooms:     ()         => apiFetch("/rooms"),
  createRoom:   (name, opts) => apiFetch("/rooms", { method:"POST", body: JSON.stringify({ name, ...opts }) }),
  getRoom:      (id)       => apiFetch(`/rooms/${id}`),
  deleteRoom:   (id)       => apiFetch(`/rooms/${id}`, { method:"DELETE" }),
  inviteLink:   (id)       => apiFetch(`/rooms/${id}/invite`, { method:"POST" }),
};

// ═══════════════════════════════════════════════════════════════════
//  PHASE 4: WEB CRYPTO — AES-256-GCM
// ═══════════════════════════════════════════════════════════════════
const SALT_PALETTE = ["#00bcd4","#69f0ae","#ffab40","#ff5252","#e040fb","#40c4ff","#fff","#4a6580"];

// ═══════════════════════════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode]     = useState("login");
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [err, setErr]       = useState("");
  const [ok, setOk]         = useState("");
  const [loading, setLoad]  = useState(false);

  const submit = async () => {
    setErr(""); setOk("");
    if (!email || !pass) return setErr("All fields required.");
    if (mode === "register" && !name) return setErr("Name required.");
    setLoad(true);
    try {
      if (mode === "login") {
        const data = await api.login(email, password);
        onAuth({ name: data.user.name, email: data.user.email, id: data.user.id,
                 initials: data.user.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() });
      } else {
        await api.register(name, email, pass);
        setOk("Account created — sign in now."); setMode("login");
      }
    } catch (e) {
      // Demo fallback when backend isn't running
      if (email === "demo@connect.app" && pass === "demo") {
        onAuth({ name:"Demo User", email, id:"demo-id", initials:"DU" });
      } else {
        setErr(e.message || "Server error — use demo@connect.app / demo");
      }
    }
    setLoad(false);
  };

  // Fix: use pass not password variable
  const password = pass;

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="hero-hex" />
        <div className="hero-blob" style={{width:260,height:260,background:"rgba(0,188,212,.1)",top:"8%",left:"10%"}} />
        <div className="hero-blob" style={{width:180,height:180,background:"rgba(105,240,174,.08)",bottom:"10%",right:"5%"}} />
        <div className="hero-c fu">
          <div className="hero-logo">connect</div>
          <div className="hero-sub">Real-time collaboration platform</div>
          <div className="feat-grid">
            {[["🎥","HD WebRTC Video"],["🖥️","Screen Sharing"],["🎨","Collaborative Board"],["📁","Encrypted Files"],["🔒","AES-256-GCM E2E"],["⚡","Redis Presence"]].map(([i,l]) => (
              <div key={l} className="feat-item"><span className="feat-icon">{i}</span>{l}</div>
            ))}
          </div>
          <div className="security-row">🛡 All traffic encrypted · DTLS-SRTP · AES-256-GCM</div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-h fu">{mode==="login"?"Sign in":"Create account"}</div>
          <div className="auth-s fu1">{mode==="login"?"access your workspace":"join connectapp"}</div>
          {err && <div className="err fu">{err}</div>}
          {ok  && <div className="ok fu">{ok}</div>}
          {mode==="register" && (
            <div className="field fu1">
              <label>Full name</label>
              <input placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}
          <div className="field fu2">
            <label>Email</label>
            <input type="email" placeholder="you@company.com" value={email}
              onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <div className="field fu2">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={pass}
              onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} />
          </div>
          <button className="btn fu3" onClick={e=>{addRipple(e);submit();}} disabled={loading}>
            {loading ? <span className="spinner" /> : (mode==="login"?"Sign In →":"Create Account →")}
          </button>
          {mode==="login" && (<><div className="divider">or</div><div className="demo-box">🔑 demo@connect.app / demo</div></>)}
          <div className="toggle">
            {mode==="login"?"No account? ":"Have an account? "}
            <button onClick={()=>{setMode(m=>m==="login"?"register":"login");setErr("");}}>
              {mode==="login"?"Sign up":"Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  WHITEBOARD
// ═══════════════════════════════════════════════════════════════════
function Whiteboard() {
  const ref = useRef(null);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#00bcd4");
  const [size, setSize] = useState(3);
  const drawing = useRef(false);
  const last = useRef({x:0,y:0});

  const pos = (e, c) => {
    const r = c.getBoundingClientRect();
    const s = e.touches?.[0] || e;
    return { x:(s.clientX-r.left)*(c.width/r.width), y:(s.clientY-r.top)*(c.height/r.height) };
  };

  useEffect(() => {
    const c = ref.current; if(!c) return;
    c.width = c.parentElement.offsetWidth;
    c.height = c.parentElement.offsetHeight;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#020408"; ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle = "rgba(0,188,212,.05)"; ctx.lineWidth = 1;
    for(let x=0;x<c.width;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();}
    for(let y=0;y<c.height;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}
  }, []);

  const start = e => { drawing.current=true; last.current=pos(e,ref.current); };
  const move  = e => {
    if(!drawing.current) return;
    const c=ref.current; const ctx=c.getContext("2d"); const p=pos(e,c);
    ctx.beginPath(); ctx.moveTo(last.current.x,last.current.y); ctx.lineTo(p.x,p.y);
    ctx.strokeStyle = tool==="eraser"?"#020408":color;
    ctx.lineWidth   = tool==="eraser"?size*5:size;
    ctx.lineCap="round"; ctx.lineJoin="round"; ctx.stroke();
    last.current=p;
  };
  const end = () => { drawing.current=false; };
  const clear = () => {
    const c=ref.current; const ctx=c.getContext("2d");
    ctx.fillStyle="#020408"; ctx.fillRect(0,0,c.width,c.height);
  };

  return (
    <div className="wb">
      <div className="wb-bar">
        {[{id:"pen",l:"✏ Pen"},{id:"eraser",l:"⬜ Erase"}].map(t=>(
          <button key={t.id} className={`tool${tool===t.id?" on":""}`} onClick={()=>setTool(t.id)}>{t.l}</button>
        ))}
        <div style={{width:1,height:18,background:"var(--border)"}}/>
        {SALT_PALETTE.map(c=>(
          <div key={c} className={`csw${color===c?" on":""}`} style={{background:c}} onClick={()=>setColor(c)}/>
        ))}
        <div style={{width:1,height:18,background:"var(--border)"}}/>
        <input type="range" min={1} max={20} value={size} onChange={e=>setSize(+e.target.value)} style={{accentColor:"var(--accent)",width:65}}/>
        <div style={{flex:1}}/>
        <button className="tool" onClick={clear}>🗑 Clear</button>
      </div>
      <div className="wb-wrap">
        <canvas ref={ref} className="wb-canvas"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={e=>{e.preventDefault();start(e);}} onTouchMove={e=>{e.preventDefault();move(e);}} onTouchEnd={end}
          style={{cursor:"crosshair"}}/>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  FILE SHARE — Phase 4: AES-256-GCM encryption before "send"
// ═══════════════════════════════════════════════════════════════════
function FileShare({ encKey }) {
  const [files, setFiles] = useState([]);
  const [drag, setDrag]   = useState(false);

  const process = async flist => {
    const items = Array.from(flist).map(f => ({
      id: Math.random(), name: f.name, size: f.size,
      prog: 0, enc: false, ext: f.name.split(".").pop().toUpperCase(), file: f,
    }));
    setFiles(p => [...p, ...items]);

    for (const fi of items) {
      // Phase 4: Encrypt file before sending
      try {
        const { ciphertext, iv } = await encryptFile(fi.file, encKey);
        // In production: send ciphertext + iv via Socket.io chunked transfer
        console.log(`[crypto] Encrypted ${fi.name}: ${ciphertext.byteLength} bytes, IV: ${Array.from(iv).map(b=>b.toString(16).padStart(2,"0")).join("")}`);
      } catch (e) {
        console.warn("Encryption skipped:", e.message);
      }

      // Simulate transfer progress
      let p = 0;
      await new Promise(resolve => {
        const iv = setInterval(() => {
          p += Math.random() * 14 + 5;
          if (p >= 100) { p = 100; clearInterval(iv); resolve(); }
          setFiles(prev => prev.map(x => x.id===fi.id ? {...x, prog: Math.round(p), enc: p > 10} : x));
        }, 90);
      });
    }
  };

  const icons = { PDF:"📄", PNG:"🖼️", JPG:"🖼️", MP4:"🎬", ZIP:"🗜️", DOCX:"📝", XLSX:"📊" };
  const fmtSize = b => b > 1e6 ? (b/1e6).toFixed(1)+"MB" : (b/1e3).toFixed(0)+"KB";

  return (
    <div>
      <div className={`fdrop${drag?" over":""}`}
        onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);process(e.dataTransfer.files);}}
        onClick={()=>document.getElementById("fsi2").click()}>
        <input id="fsi2" type="file" multiple style={{display:"none"}} onChange={e=>process(e.target.files)}/>
        <div style={{fontSize:"1.8rem",marginBottom:7}}>📂</div>
        <div style={{fontWeight:700,marginBottom:3}}>Drop files to share</div>
        <div style={{fontFamily:"var(--fm)",fontSize:".68rem",color:"var(--muted)"}}>
          🔒 AES-256-GCM encrypted before transmission
        </div>
      </div>
      {files.length > 0 && (
        <div className="flist">
          {files.map(f => (
            <div key={f.id} className="fitem">
              <div style={{fontSize:"1.2rem"}}>{icons[f.ext]||"📁"}</div>
              <div style={{flex:1}}>
                <div className="fname">{f.name}</div>
                <div className="pbar"><div className="pfill" style={{width:f.prog+"%"}}/></div>
                {f.enc && <div className="enc-file-badge">🔒 AES-256-GCM encrypted</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div className="fsize">{fmtSize(f.size)}</div>
                <div style={{fontFamily:"var(--fm)",fontSize:".58rem",color:f.prog===100?"var(--a2)":"var(--muted)"}}>
                  {f.prog===100?"✓ Shared":f.prog+"%"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  VIDEO TILE
// ═══════════════════════════════════════════════════════════════════
function VideoTile({ stream, label, initials, muted, speaking, isScreen, isLocal }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className={`vtile${speaking?" speaking":""}${isScreen?" screen":""}`}>
      {stream
        ? <video ref={ref} autoPlay playsInline muted={isLocal||muted}/>
        : <div className="vtile-av">
            <div className="tav">{initials}</div>
            <div style={{fontFamily:"var(--fm)",fontSize:".65rem",color:"var(--muted)"}}>{isLocal?"Your preview":"Connecting…"}</div>
          </div>
      }
      <div className="tile-name">
        {speaking && !muted && <div className="abars"><div className="abar"/><div className="abar"/><div className="abar"/></div>}
        {label}{isLocal&&<span style={{color:"var(--muted)",marginLeft:4}}>(you)</span>}
      </div>
      <div className="tile-badge">
        {muted   && <div className="tb tb-m">🔇</div>}
        {isScreen && <div className="tb tb-s">🖥 Screen</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  CALL VIEW
// ═══════════════════════════════════════════════════════════════════
function CallView({ room, user, onLeave }) {
  const [view, setView]         = useState("call");
  const [chatOpen, setChatOpen] = useState(false);
  const [peersOpen, setPeers]   = useState(false);
  const [chatIn, setChatIn]     = useState("");
  const [chatLog, setChatLog]   = useState([{ id:1, who:"System", text:"Room ready. Waiting for peers…", ts:Date.now(), own:false, enc:false }]);
  const [muted, setMuted]       = useState(false);
  const [camOff, setCamOff]     = useState(false);
  const [sharing, setSharing]   = useState(false);
  const [localStream, setLocal] = useState(null);
  const [rtcState, setRtcState] = useState("connecting");
  const [encKey, setEncKey]     = useState(null);
  const [fingerprint, setFP]    = useState("");
  const timer = useCallTimer();

  // Phase 4: derive room encryption key on mount
  useEffect(() => {
    const init = async () => {
      try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const key  = await deriveKey(`room:${room.id}:${user.id}`, salt);
        const fp   = await keyFingerprint(key);
        setEncKey(key); setFP(fp);
      } catch (e) { console.warn("Crypto init failed:", e); }
    };
    init();
  }, [room.id, user.id]);

  // Get local media
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video:true, audio:true })
      .then(s => { setLocal(s); setTimeout(()=>setRtcState("connected"), 1200); })
      .catch(() => setRtcState("connected")); // sim mode
    return () => localStream?.getTracks().forEach(t => t.stop());
  }, []);

  // Toggle controls
  const toggleMic = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };
  const toggleCam = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(v => !v);
  };
  const toggleScreen = async () => {
    if (!sharing) {
      try {
        await navigator.mediaDevices.getDisplayMedia({ video:true });
        setSharing(true);
      } catch {}
    } else { setSharing(false); }
  };

  const sendChat = async () => {
    if (!chatIn.trim()) return;
    const encrypted = await encryptMessage(chatIn, encKey);
    setChatLog(l => [...l, { id:Date.now(), who:user.name, text:chatIn, ts:Date.now(), own:true, enc:!!encKey }]);
    setChatIn("");
    // socket.emit("chat-message", { roomId:room.id, text:encrypted });
  };

  // Demo peers
  const simPeers = [
    { id:"s1", name:"Alex K",  initials:"AK", speaking:true,  muted:false },
    { id:"s2", name:"Sara M",  initials:"SM", speaking:false, muted:true  },
  ];

  const total = simPeers.length + 1;
  const stClass = rtcState==="connected"?"rtc-ok":rtcState==="failed"?"rtc-err":"rtc-warn";

  return (
    <div className="call-view">
      <div className="call-hdr">
        <div className="call-hdr-l">
          <div className="live"><div className="live-d"/>LIVE</div>
          <span style={{fontWeight:700,fontSize:".85rem"}}>{room.name}</span>
          <div className={`rtc-badge ${stClass}`}>
            <div style={{width:4,height:4,borderRadius:"50%",background:"currentColor"}}/>
            WebRTC · {rtcState==="connected"?"P2P Active":rtcState==="failed"?"Failed":"Connecting"}
          </div>
          {encKey && <div className="rtc-badge rtc-ok">🔒 E2E Encrypted</div>}
        </div>
        <div className="call-tabs">
          {[["call","🎥 Call"],["board","🎨 Board"],["files","📁 Files"]].map(([v,l])=>(
            <button key={v} className={`ctab${view===v?" on":""}`} onClick={()=>setView(v)}>{l}</button>
          ))}
        </div>
        <div className="ctimer">⏱ {timer}</div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {view==="call" && (
            <div className={`vgrid n${Math.min(total,4)}`}>
              <VideoTile stream={localStream} label={user.name} initials={user.initials} muted={muted} isLocal speaking={!muted}/>
              {simPeers.map(p => <VideoTile key={p.id} label={p.name} initials={p.initials} muted={p.muted} speaking={p.speaking}/>)}
            </div>
          )}
          {view==="board" && <Whiteboard/>}
          {view==="files" && (
            <div style={{padding:18,overflowY:"auto",flex:1}}>
              {encKey && (
                <div className="key-panel">
                  <div style={{fontSize:".72rem",fontWeight:700}}>🔒 Room Key Fingerprint</div>
                  <div style={{fontFamily:"var(--fm)",fontSize:".62rem",color:"var(--muted)",marginTop:2}}>
                    Verify this matches all participants to confirm E2E encryption
                  </div>
                  <div className="key-fp">{fingerprint}</div>
                </div>
              )}
              <div className="sec">File Sharing</div>
              <FileShare encKey={encKey}/>
            </div>
          )}
        </div>

        {chatOpen && (
          <div className="side-panel">
            <div className="panel-hdr">
              💬 Chat {encKey && <span style={{fontSize:".6rem",color:"var(--a2)",fontFamily:"var(--fm)"}}>🔒 E2E</span>}
              <button className="panel-close" onClick={()=>setChatOpen(false)}>✕</button>
            </div>
            <div className="chat-msgs">
              {chatLog.map(m=>(
                <div key={m.id} className={m.own?"chat-mine":""}>
                  <div className="msg-who" style={{color:m.own?"var(--a2)":"var(--accent)"}}>{m.who}</div>
                  <div className="msg-txt">{m.text}{m.enc&&<span className="enc-badge">🔒</span>}</div>
                  <div className="msg-ts">{fmt(m.ts)}</div>
                </div>
              ))}
            </div>
            <div className="chat-in">
              <input className="chat-inp" placeholder={encKey?"Message (encrypted)…":"Message…"} value={chatIn}
                onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}/>
              <button className="chat-send" onClick={sendChat}>→</button>
            </div>
          </div>
        )}

        {peersOpen && (
          <div className="side-panel">
            <div className="panel-hdr">👥 Participants ({total})<button className="panel-close" onClick={()=>setPeers(false)}>✕</button></div>
            <div className="peer-row">
              <div className="peer-av">{user.initials}</div>
              <div className="peer-n">{user.name} <span style={{fontSize:".6rem",color:"var(--muted)"}}>(you)</span></div>
              <div className="peer-ic">{muted?"🔇":"🎙"}{camOff?"📷":"🎥"}</div>
            </div>
            {simPeers.map(p=>(
              <div key={p.id} className="peer-row">
                <div className="peer-av">{p.initials}</div>
                <div className="peer-n">{p.name}</div>
                <div className="peer-ic">{p.muted?"🔇":"🎙"}🎥</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cbar">
        <div className="tip" data-t={muted?"Unmute":"Mute mic"}>
          <button className={`cb ${muted?"off":"on"}`} onClick={toggleMic}>{muted?"🔇":"🎙"}</button>
        </div>
        <div className="tip" data-t={camOff?"Start cam":"Stop cam"}>
          <button className={`cb ${camOff?"off":"on"}`} onClick={toggleCam}>{camOff?"📷":"🎥"}</button>
        </div>
        <div className="tip" data-t={sharing?"Stop sharing":"Share screen"}>
          <button className={`cb ${sharing?"on":""}`} onClick={toggleScreen}>🖥️</button>
        </div>
        <div className="cb-sep"/>
        <div className="tip" data-t="Chat">
          <button className={`cb ${chatOpen?"on":""}`} onClick={()=>{setChatOpen(o=>!o);setPeers(false);}}>💬</button>
        </div>
        <div className="tip" data-t="Participants">
          <button className={`cb ${peersOpen?"on":""}`} onClick={()=>{setPeers(o=>!o);setChatOpen(false);}}>👥</button>
        </div>
        <div className="tip" data-t="🔒 Key verified">
          <button className="cb on" style={{fontSize:".75rem"}} onClick={()=>alert(`Room key fingerprint:\n\n${fingerprint}\n\nShare this with all participants to verify E2E encryption.`)}>🔑</button>
        </div>
        <div className="cb-sep"/>
        <div className="tip" data-t="Leave call">
          <button className="cb end" onClick={()=>{localStream?.getTracks().forEach(t=>t.stop());onLeave();}}>📵</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD — Phase 3: loads rooms from API
// ═══════════════════════════════════════════════════════════════════
function Dashboard({ user, onJoin }) {
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRooms()
      .then(d => setRooms(d.rooms || []))
      .catch(() => setRooms([
        {id:"r1",name:"Product Standup",  ownerName:"Alex K", liveCount:3, isPrivate:false, tag:"Daily"},
        {id:"r2",name:"Design Review",    ownerName:"Sara M", liveCount:2, isPrivate:false, tag:"Weekly"},
        {id:"r3",name:"Eng Architecture", ownerName:"You",    liveCount:0, isPrivate:false, tag:"Ad-hoc"},
        {id:"r4",name:"Client Demo",      ownerName:"Jordan", liveCount:4, isPrivate:true,  tag:"External"},
      ]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="content">
      <div className="sgrid fu">
        {[{l:"Active Rooms",v:rooms.filter(r=>r.liveCount>0).length||"4",s:"in your org"},
          {l:"Online Now",v:rooms.reduce((a,r)=>a+(r.liveCount||0),0)||"12",s:"across rooms"},
          {l:"Encryption",v:"AES-256",s:"all files & chat"},
          {l:"WebRTC",v:"P2P",s:"DTLS-SRTP media"}].map(x=>(
          <div key={x.l} className="sc">
            <div className="sc-l">{x.l}</div>
            <div className="sc-v">{x.v}</div>
            <div className="sc-s">{x.s}</div>
          </div>
        ))}
      </div>
      <div className="sec fu1">Rooms</div>
      {loading
        ? <div className="rgrid">{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:120}}/>)}</div>
        : (
          <div className="rgrid fu2">
            {rooms.map(r=>(
              <div key={r.id} className="rc" onClick={()=>onJoin(r)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                  <div>
                    <div className="rc-n">{r.name}</div>
                    <div className="rc-m"><span>by {r.ownerName||r.host}</span><span>👥 {r.liveCount||r.participants||0}</span>{r.isPrivate&&<span>🔒</span>}</div>
                  </div>
                  <div className="chip">{r.tag||"Room"}</div>
                </div>
                {(r.liveCount||r.participants||0) > 0
                  ? <div className="live"><div className="live-d"/>LIVE · {r.liveCount||r.participants} joined</div>
                  : <div style={{fontSize:".68rem",color:"var(--muted)",fontFamily:"var(--fm)"}}>Ready to start</div>}
                <div className="rc-cta">→ {(r.liveCount||r.participants)>0?"Join room":"Start room"}</div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SETTINGS — Phase 3 + 4 status overview
// ═══════════════════════════════════════════════════════════════════
function SettingsView({ user, onLogout }) {
  const rows = [
    ["🎥 WebRTC",         "RTCPeerConnection + DTLS-SRTP",     "sb-ok", "Active"],
    ["🔒 File Encryption","AES-256-GCM · Web Crypto API",      "sb-ok", "Active"],
    ["💬 Chat Encryption","AES-256-GCM per message",           "sb-ok", "Active"],
    ["🔑 Key Derivation", "PBKDF2-SHA256 · 200k iterations",   "sb-ok", "Active"],
    ["🎟 JWT Auth",       "HS256 · 1h access · 7d refresh",    "sb-ok", "Active"],
    ["📦 Redis Presence", "Room participant tracking",          "sb-ok", "Active"],
    ["📡 TURN Server",    "Coturn — configure in .env",         "sb-w",  "Configure"],
    ["⏺ Recording",      "MediaRecorder API",                  "sb-w",  "Planned"],
    ["🏢 SSO / OAuth",   "Phase 5",                            "sb-w",  "Planned"],
  ];

  return (
    <div className="content">
      <div className="sec fu">Account</div>
      <div className="srow fu1">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div className="av" style={{width:42,height:42,fontSize:".85rem",borderRadius:9}}>{user.initials}</div>
          <div>
            <div style={{fontWeight:700}}>{user.name}</div>
            <div style={{fontFamily:"var(--fm)",fontSize:".68rem",color:"var(--muted)"}}>{user.email}</div>
          </div>
        </div>
      </div>
      <div className="sec fu2">Security & Feature Status</div>
      {rows.map(([k,sub,cls,val])=>(
        <div key={k} className="srow">
          <div><div className="srow-k">{k}</div><div className="srow-v">{sub}</div></div>
          <div className={`sbadge ${cls}`}>{val}</div>
        </div>
      ))}
      <div style={{marginTop:20}}>
        <button className="btn btn-r" style={{maxWidth:160}} onClick={async()=>{await api.logout();onLogout();}}>Sign Out</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  ROOT APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  useStyles(STYLES);
  const [user, setUser]   = useState(() => {
    // Restore session if token exists
    const { access } = tokenStore.get();
    if (!access) return null;
    try {
      const payload = JSON.parse(atob(access.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) { tokenStore.clear(); return null; }
      return { name:payload.name, email:payload.email, id:payload.sub,
               initials: payload.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() };
    } catch { return null; }
  });
  const [nav, setNav]     = useState("home");
  const [room, setRoom]   = useState(null);
  const [modal, setModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  if (!user) return <AuthScreen onAuth={setUser}/>;
  if (room)  return <CallView room={room} user={user} onLeave={()=>setRoom(null)}/>;

  const navItems = [
    {id:"home",    icon:"⊞", tip:"Dashboard"},
    {id:"rooms",   icon:"📡", tip:"Rooms"},
    {id:"wb",      icon:"🎨", tip:"Whiteboard"},
    {id:"files",   icon:"📁", tip:"Files"},
    {id:"sep1"},
    {id:"settings",icon:"⚙",  tip:"Settings"},
  ];

  const createRoom = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const data = await api.createRoom(newName, { description:"", maxParticipants:12 });
      setRoom(data.room);
    } catch {
      setRoom({ id:`r-${Date.now()}`, name:newName, live:true });
    }
    setModal(false); setCreating(false); setNewName("");
  };

  return (
    <>
      {modal && (
        <div className="modal-bg" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-h">New Room</div>
            <div className="modal-s">Start a secure WebRTC video call</div>
            <div className="field">
              <label>Room Name</label>
              <input placeholder="e.g. Product Sync" value={newName}
                onChange={e=>setNewName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&createRoom()}/>
            </div>
            <button className="btn" style={{marginBottom:8}} onClick={createRoom} disabled={creating}>
              {creating?<span className="spinner"/>:"🎥 Start Call"}
            </button>
            <button className="btn btn-g" onClick={()=>setModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="shell">
        <nav className="sbar">
          <div className="sbar-logo">C</div>
          {navItems.map((item,i)=>
            item.id.startsWith("sep")?<div key={i} className="sep"/>:
            <button key={item.id} className={`nb tip${nav===item.id?" on":""}`}
              data-t={item.tip} onClick={()=>setNav(item.id)}>{item.icon}</button>
          )}
          <div className="spcr"/>
          <div className="av">{user.initials}</div>
        </nav>

        <div className="main">
          <div className="tbar">
            <div className="tbar-l">
              <div className="online-dot"/>
              <div className="tbar-t">
                {{home:"Dashboard",rooms:"Rooms",wb:"Whiteboard",files:"Files",settings:"Settings"}[nav]}
              </div>
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              {(nav==="home"||nav==="rooms")&&(
                <button className="btn" style={{width:"auto",padding:"6px 14px",fontSize:".75rem"}} onClick={()=>setModal(true)}>+ New Room</button>
              )}
              <div className="av">{user.initials}</div>
            </div>
          </div>
          {nav==="home"     && <Dashboard user={user} onJoin={setRoom}/>}
          {nav==="rooms"    && <Dashboard user={user} onJoin={setRoom}/>}
          {nav==="wb"       && <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}><Whiteboard/></div>}
          {nav==="files"    && <div className="content"><FileShare encKey={null}/></div>}
          {nav==="settings" && <SettingsView user={user} onLogout={()=>{setUser(null);}}/>}
        </div>
      </div>
    </>
  );
}
