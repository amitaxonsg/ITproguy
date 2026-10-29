import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUp, ArrowUpRight, Plus, MessageSquare, Clock3, CircleHelp, Globe2, Mail, Monitor, ShieldCheck, Sparkles, ChevronDown, PanelRight, LockKeyhole, MousePointer2, Check, X, ExternalLink, RotateCcw, ChevronRight } from 'lucide-react';
import './styles.css';

const suggestions = [
  { icon: Globe2, title: 'Update my website', detail: 'Content, pages & quick fixes', prompt: 'I need help updating content on my website.' },
  { icon: Mail, title: 'Fix an email issue', detail: 'Sending, receiving & setup', prompt: 'I have an email problem. Help me check what is wrong.' },
  { icon: Monitor, title: 'Help with my apps', detail: 'Google, Microsoft 365 & more', prompt: 'Help me check an issue with my business apps.' },
  { icon: Sparkles, title: 'Something else', detail: 'Tell Axel what you need', prompt: '' },
];
function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  return <div className="modal-backdrop" onClick={onClose}><section className="dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}
    onKeyDown={e => { if (e.key === 'Escape') onClose(); if(e.key==='Tab'){ const els=ref.current.querySelectorAll('button,a[href]'); if(!els.length)return; const first=els[0],last=els[els.length-1]; if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}} }} onClick={e=>e.stopPropagation()}>
    <header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" autoFocus onClick={onClose}><X size={19}/></button></header>{children}
  </section></div>;
}
const platforms = [
  ['wordpress','WordPress','Websites & publishing'],['wix','Wix','Website builder'],
  ['shopify','Shopify','Online stores'],['google','Google Workspace','Email & business apps'],
  ['microsoft','Microsoft 365','Business apps & collaboration'],['squarespace','Squarespace','Websites & commerce'],
  ['zoho','Zoho','Business software'],['webflow','Webflow','Website builder'],
  ['woocommerce','WooCommerce','Online stores'],['cpanel','cPanel','Hosting management'],
  ['notion','Notion','Notes & workspaces'],['trello','Trello','Project management'],
  ['hubspot','HubSpot','CRM & marketing'],['figma','Figma','Design & collaboration'],
  ['quickbooks','QuickBooks','Business accounting'],['github','GitHub','Projects & repositories'],
  ['stripe','Stripe','Payment management'],['zapier','Zapier','Connected workflows'],
  ['asana','Asana','Team projects'],['zoom','Zoom','Meetings & collaboration']
];
function PlatformMarquee(){
  return <section className="platform-showcase" aria-label="Example browser-based platforms">
    <h3>Your tools. One workspace.</h3>
    <p>Axel can assist with browser-based software, tools and platforms.</p>
    <div className="logo-marquee" aria-label="Scrolling platform examples. Hover or focus to pause."><div className="logo-track">
      {[0,1].map(copy=><div className="logo-group" role={copy===0?'list':undefined} aria-hidden={copy===1?true:undefined} key={copy}>
        {platforms.map(([slug,name,detail])=><div className="platform-card" role={copy===0?'listitem':undefined} tabIndex={copy===0?0:undefined} title={name+' · '+detail+' · Example platform'} key={slug}>
          {slug==='microsoft'?<span className="microsoft-logo" aria-hidden="true"><i/><i/><i/><i/></span>:<img src={'/assets/platforms/'+slug+'.svg'} alt="" width="38" height="38" loading="lazy"/>}<span>{name}</span>
        </div>)}
      </div>)}
    </div></div>
    <p className="platform-availability">Platform examples shown. Available actions depend on the platform and connected features.</p>
  </section>
}
function PreviewPanel({ task, stage, onStage, compact }) {
  return <section className={'preview-panel '+(compact?'mobile-preview':'')} aria-label="Browser workspace">
    <div className="preview-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>See every step.</h2></div><span className="control-badge"><ShieldCheck size={14}/> You’re in control</span></div>
    <div className="browser-window">
      <div className="browser-toolbar"><div className="window-dots"><i/><i/><i/></div><div className="address-bar"><LockKeyhole size={12}/><span>{task?'Preview session · no service connected':'Your browser will appear here'}</span></div><span className="preview-tag">PREVIEW</span></div>
      <div className="browser-canvas">
        <div className="canvas-status"><span/><span>{stage === 'approved' ? 'Sample completed' : task ? 'Task preview' : 'Ready for your first task'}</span></div>
        <div className="preview-center">
          <div className="browser-art" aria-hidden="true"><div className="art-orbit"/><div className="mini-window back"/><div className="mini-window front"><div className="mini-toolbar"><i/><i/><i/></div><div className="mini-content"><div className="mini-square"><MousePointer2 size={25}/></div><div className="mini-lines"><i/><i/><i/></div></div><span className="floating-check"><Check size={17}/></span></div><span className="art-spark s1">✦</span><span className="art-spark s2">✦</span></div>
          <h3>{stage==='approved'?'You approved the sample.':task?'Your task. A clear next step.':'A front-row seat to getting it done.'}</h3>
          <p>{stage==='approved'?'Nothing was changed on a real service. This preview shows how your approval will work.':task?'In the connected service, Axel will inspect the page and show you the exact proposed change here.':'Watch Axel check your page, explain the findings, and prepare a change for you to review.'}</p>
          {task ? <button className="preview-action" onClick={()=>onStage(stage==='approved'?'ready':'review')}>{stage==='approved'?<>Reset sample <RotateCcw size={14}/></>:<>Explore the approval step <ArrowUpRight size={15}/></>}</button> : <span className="waiting-pill"><span className="pulse-dot"/>Waiting for your task</span>}
          <div className="workflow-steps"><span><b>1</b> Describe</span><ChevronRight size={12}/><span><b>2</b> Review</span><ChevronRight size={12}/><span><b>3</b> Approve</span></div>
        </div>
        <div className="canvas-footer"><LockKeyhole size={12}/> Visual preview only. No live accounts connected.</div>
      </div>
    </div>
    <PlatformMarquee/>
    <div className="sign-in-guidance"><span className="guidance-icon"><ShieldCheck size={24}/></span><div><strong>Secure sign-in. You stay in control.</strong><p>You’ll be asked to sign in to your own platform in the browser to make the updates you request. Never type passwords, verification codes or recovery codes in the chat request.</p></div></div>
  </section>;
}
function App(){
  const [prompt,setPrompt]=useState(''); const [tasks,setTasks]=useState([]); const [activeTask,setActiveTask]=useState('');
  const [stage,setStage]=useState('ready'); const [dialog,setDialog]=useState(null); const [showPreview,setShowPreview]=useState(false);
  const input=useRef(null); const returnFocus=useRef(null);
  const openDialog=name=>{returnFocus.current=document.activeElement;setDialog(name)};
  const closeDialog=()=>{setDialog(null);requestAnimationFrame(()=>returnFocus.current?.focus())};
  const newTask=()=>{setPrompt('');setActiveTask('');setStage('ready');setShowPreview(false);input.current?.focus()};
  function submit(e){e.preventDefault();const text=prompt.trim();if(!text){input.current?.focus();return}setTasks(t=>[text,...t]);setActiveTask(text);setPrompt('');setStage('ready')}
  function selectSuggestion(s){setPrompt(s.prompt);input.current?.focus()}
  function changeStage(s){if(s==='review')openDialog('approval');else setStage(s)}
  return <div className="app-shell">
    <header className="app-header"><a className="logo-link" href="/" aria-label="ITProGuy home"><img src="/assets/itproguy-logo.svg?v=readable1" alt="ITProGuy by Axon 1Pro Group"/></a><div className="header-location"><span className="header-slash">/</span><span>Workspace</span><span className="beta-label">PREVIEW</span></div><div className="header-right"><span className="trial-pill"><span className="trial-icon"><Clock3 size={15}/></span><strong>30 min</strong><span>trial preview</span></span><button className="header-help" onClick={()=>openDialog('help')}><CircleHelp size={17}/><span>Help</span></button><button className="sign-in-button" onClick={()=>openDialog('signin')}>Sign in <ArrowUpRight size={15}/></button></div></header>
    <div className="app-body"><nav className="nav-rail" aria-label="Workspace navigation"><button className="new-icon" title="New task" aria-label="New task" onClick={newTask}><Plus size={22}/></button><button className="rail-item active" title="Current task" aria-label="Current task" onClick={()=>{setShowPreview(false);input.current?.focus()}}><MessageSquare size={21}/><i/></button><button className="rail-item" title="Session history" aria-label="Session history" onClick={()=>openDialog('history')}><Clock3 size={21}/></button><div className="rail-spacer"/><button className="rail-item" title="Help and support" aria-label="Help and support" onClick={()=>openDialog('help')}><CircleHelp size={21}/></button><button className="guest-avatar" aria-label="Guest account" onClick={()=>openDialog('signin')}>G</button></nav>
    <main className="workspace-grid">
      <section className={'chat-panel '+(showPreview?'hide-on-mobile':'')} aria-label="Chat with Axel">
        <div className="chat-topbar"><div className="chat-person"><span className="axel-mini"><img src="/assets/axel-avatar.webp" alt="Axel"/><i/></span><div><strong>Axel <span>Your IT Pro Guy</span></strong><small>A little expertise. A lot less hassle.</small></div></div><button className="icon-button new-task-button" onClick={newTask} aria-label="Start a new task" title="Start a new task"><Plus size={18}/></button></div>
        <div className={'conversation '+(activeTask?'has-task':'')} aria-live="polite">
          {activeTask?<div className="messages"><div className="user-message">{activeTask}</div><div className="assistant-message"><span className="message-mark"><Sparkles size={16}/></span><div><strong>Let’s take a look together.</strong><p>This is a workspace preview. In the live service, I’ll ask for the website or app, check the issue, and explain the next step before you approve anything.</p><span className="sample-note"><ShieldCheck size={12}/> No live action has been taken.</span></div></div><button className="inline-preview" onClick={()=>{setShowPreview(true);changeStage('review')}}>See how approval works <ArrowUpRight size={14}/></button></div>:<div className="welcome"><div className="welcome-avatar"><img src="/assets/axel-avatar.webp" alt="Meet Axel, your IT Pro Guy"/><span><Sparkles size={15}/></span></div><span className="welcome-kicker">MEET YOUR EVERYDAY IT SIDEKICK</span><h1>Hi, I’m Axel.<br/>What can I sort out for you?</h1><p>Tell me what you need. I’ll handle the technical bits,<br className="desktop-break"/> and keep you in the loop.</p><div className="suggestion-grid">{suggestions.map(s=><button className="suggestion" key={s.title} onClick={()=>selectSuggestion(s)}><span className="suggestion-icon"><s.icon size={17}/></span><div><strong>{s.title}</strong><small>{s.detail}</small></div><ArrowUpRight size={14} className="suggestion-arrow"/></button>)}</div></div>}
        </div>
        <div className="composer-area"><form className="task-composer" onSubmit={submit}><label htmlFor="task-input">YOUR TASK, IN YOUR WORDS</label><textarea ref={input} id="task-input" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Tell Axel what you’d like to do…&#10;&#10;A website update? An email problem? Something else?&#10;Start anywhere — no technical words needed."/><div className="composer-bottom"><span><ShieldCheck size={13}/> You approve every change</span><button className="send-button" type="submit" disabled={!prompt.trim()}><span>Let’s do this</span><ArrowUp size={18}/></button></div></form><div className="composer-caption"><span>No passwords or verification codes in chat.</span><button className="mobile-view-button" onClick={()=>setShowPreview(true)}><PanelRight size={13}/> Open workspace</button><span className="company-credit">By Axon 1Pro Group</span></div></div>
      </section>
      <div className={'preview-wrapper '+(!showPreview?'hide-on-mobile':'')}><button className="mobile-back" onClick={()=>setShowPreview(false)}>← Back to Axel</button><PreviewPanel task={activeTask} stage={stage} onStage={changeStage} compact={showPreview}/></div>
    </main></div>
    {dialog?<Dialog title={dialog==='history'?'Your session':dialog==='help'?'A hand when you need it':dialog==='approval'?'Your approval comes first':'Your workspace, coming together'} onClose={closeDialog}>{dialog==='history'?<><p>Tasks from this browser session. They clear when you reload.</p>{tasks.length?<ul className="history-list">{tasks.map((t,i)=><li key={i}><button onClick={()=>{setActiveTask(t);setStage('ready');closeDialog()}}><MessageSquare size={16}/><span>{t}</span><ArrowUpRight size={15}/></button></li>)}</ul>:<div className="empty-history"><Clock3 size={28}/><p>No tasks yet. Start with a question for Axel.</p></div>}</>:dialog==='help'?<><p>Start with what you want to achieve. Axel’s connected service will check first and ask you to review proposed changes.</p><div className="info-box">You’re viewing an interactive design preview. AI, accounts, payments, and live browser actions are not connected yet.</div><a className="support-link" href="https://wa.me/639614044560" target="_blank" rel="noreferrer">Talk to Axon support <ExternalLink size={15}/></a></>:dialog==='approval'?<><p>This sample demonstrates the approval step. A connected workflow will show the exact site, proposed edit, and recovery options here.</p><div className="approval-sample"><span>DEMO ACTION</span><strong>Review a proposed website update</strong><p>This sample has no connected service and makes no real changes.</p></div><div className="dialog-actions"><button className="secondary-button" onClick={closeDialog}>Not now</button><button className="primary-button" onClick={()=>{setStage('approved');closeDialog()}}>Approve sample <Check size={15}/></button></div></>:<><p>Customer sign-in and saved work will be available in the next phase. You can explore this preview without an account.</p><div className="info-box">The trial balance is a design preview. No time is deducted and no payment is collected.</div><button className="primary-button" onClick={closeDialog}>Continue exploring <ArrowUpRight size={15}/></button></>}</Dialog>:null}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
