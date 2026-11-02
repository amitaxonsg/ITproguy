// One capture per browser, shared only by authenticated viewers of that account.
const hubs=new Map();
function makeHub(user,pilot,task,session){
 const h={task,session,viewers:new Set(),closed:false,cdp:null,page:null,frame:null,frameTimer:null,timer:null,changing:false,lastFrameAt:0,lastRestart:0,navigationHandler:null};
 h.send=(event,value)=>{for(const viewer of h.viewers)viewer.send(event,value)};
 h.close=()=>{if(h.closed)return;h.closed=true;clearInterval(h.timer);clearTimeout(h.frameTimer);if(hubs.get(user.id)===h)hubs.delete(user.id);if(h.page&&h.navigationHandler)h.page.off('domcontentloaded',h.navigationHandler);h.cdp?.send('Page.stopScreencast').catch(()=>{});h.cdp?.detach().catch(()=>{});h.frame=null;for(const viewer of [...h.viewers])viewer.stop()};
 h.attach=async()=>{if(h.closed||h.changing)return;h.changing=true;try{if(h.page&&h.navigationHandler)h.page.off('domcontentloaded',h.navigationHandler);await h.cdp?.send('Page.stopScreencast').catch(()=>{});await h.cdp?.detach().catch(()=>{});if(h.page&&h.navigationHandler)h.page.off('domcontentloaded',h.navigationHandler);h.frame=null;h.send('updating',{reason:'page'});h.page=session.page;h.navigationHandler=()=>{h.frame=null;h.send('updating',{reason:'navigation'});h.restart().catch(h.close)};h.page.on('domcontentloaded',h.navigationHandler);h.cdp=await session.context.newCDPSession(h.page);const current=h.cdp;
 current.on('Page.screencastFrame',frame=>{current.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});if(h.closed||current!==h.cdp)return;h.lastFrameAt=Date.now();h.frame={data:frame.data,width:frame.metadata.deviceWidth,height:frame.metadata.deviceHeight};if(!h.frameTimer)h.frameTimer=setTimeout(()=>{h.frameTimer=null;if(h.frame)h.send('frame',h.frame)},40)});
 await current.send('Page.startScreencast',{format:'jpeg',quality:55,maxWidth:1920,maxHeight:1080,everyNthFrame:1});h.lastRestart=Date.now();h.send('connected',{ok:true});
 }finally{h.changing=false}};
 h.restart=async()=>{if(h.closed||h.changing||!h.cdp)return;h.changing=true;h.lastRestart=Date.now();try{await h.cdp.send('Page.stopScreencast');await h.cdp.send('Page.startScreencast',{format:'jpeg',quality:55,maxWidth:1920,maxHeight:1080,everyNthFrame:1})}finally{h.changing=false}};
 h.timer=setInterval(()=>{const current=pilot.tasks.get(user.id);if(!current||pilot.browser.sessions.get(user.id)!==session)return h.close();h.task=current;for(const viewer of [...h.viewers])if(!viewer.valid())viewer.stop();if(h.closed)return;if(h.page!==session.page)h.attach().catch(h.close);else if(Date.now()-Math.max(h.lastFrameAt,h.lastRestart)>5000)h.restart().catch(h.close);h.send('heartbeat',{at:Date.now(),frameAt:h.lastFrameAt})},2000);h.timer.unref?.();return h;
}
export async function streamPilot(req,res,{user,pilot,sessionValid}){
 if(req.method!=='GET'){res.writeHead(405);return res.end()}
 if(!user||user.account_status!=='active'){res.writeHead(401);return res.end()}
 if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site'])){res.writeHead(403);return res.end()}
 const task=pilot.tasks.get(user.id),session=pilot.browser.sessions.get(user.id);if(!task||!session){res.writeHead(409);return res.end()}
 let h=hubs.get(user.id);if(h&&(h.session!==session)){h.close();h=null}if(h)h.task=task;let created=false;if(!h){h=makeHub(user,pilot,task,session);hubs.set(user.id,h);created=true}
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();res.socket?.setNoDelay(true);let closed=false;
 const viewer={valid:sessionValid,send(event,value){if(!closed&&!res.writableEnded&&res.writableLength<131072){if(event==='frame')viewer.lastFrame=value;res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`)}},stop(){if(closed)return;closed=true;h.viewers.delete(viewer);res.end();if(!h.viewers.size)h.close()}};
 h.viewers.add(viewer);res.on('close',viewer.stop);res.on('drain',()=>{if(h.frame&&h.frame!==viewer.lastFrame)viewer.send('frame',h.frame)});if(h.frame)viewer.send('frame',h.frame);if(created)try{await h.attach()}catch{h.close()}
}
