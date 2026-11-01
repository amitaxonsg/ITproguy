// One capture per browser, shared only by authenticated viewers of that account.
const hubs=new Map();
function makeHub(user,pilot,task,session){
 const h={task,session,viewers:new Set(),closed:false,cdp:null,page:null,frame:null,frameTimer:null,timer:null,changing:false};
 h.send=(event,value)=>{for(const viewer of h.viewers)viewer.send(event,value)};
 h.close=()=>{if(h.closed)return;h.closed=true;clearInterval(h.timer);clearTimeout(h.frameTimer);if(hubs.get(user.id)===h)hubs.delete(user.id);h.cdp?.send('Page.stopScreencast').catch(()=>{});h.cdp?.detach().catch(()=>{});h.frame=null;for(const viewer of [...h.viewers])viewer.stop()};
 h.attach=async()=>{if(h.closed||h.changing)return;h.changing=true;try{await h.cdp?.send('Page.stopScreencast').catch(()=>{});await h.cdp?.detach().catch(()=>{});h.page=session.page;h.cdp=await session.context.newCDPSession(h.page);const current=h.cdp;
 current.on('Page.screencastFrame',frame=>{current.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});if(h.closed||current!==h.cdp)return;h.frame={data:frame.data,width:frame.metadata.deviceWidth,height:frame.metadata.deviceHeight};if(!h.frameTimer)h.frameTimer=setTimeout(()=>{h.frameTimer=null;if(h.frame)h.send('frame',h.frame)},40)});
 await current.send('Page.startScreencast',{format:'jpeg',quality:55,maxWidth:1920,maxHeight:1080,everyNthFrame:1});h.send('connected',{ok:true});
 }finally{h.changing=false}};
 h.timer=setInterval(()=>{if(pilot.tasks.get(user.id)!==task||pilot.browser.sessions.get(user.id)!==session)return h.close();for(const viewer of [...h.viewers])if(!viewer.valid())viewer.stop();if(h.closed)return;if(h.page!==session.page)h.attach().catch(h.close);h.send('heartbeat',{at:Date.now()})},2000);h.timer.unref?.();return h;
}
export async function streamPilot(req,res,{user,pilot,sessionValid}){
 if(req.method!=='GET'){res.writeHead(405);return res.end()}
 if(!user||user.account_status!=='active'){res.writeHead(401);return res.end()}
 if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site'])){res.writeHead(403);return res.end()}
 const task=pilot.tasks.get(user.id),session=pilot.browser.sessions.get(user.id);if(!task||!session){res.writeHead(409);return res.end()}
 let h=hubs.get(user.id);if(h&&(h.task!==task||h.session!==session)){h.close();h=null}let created=false;if(!h){h=makeHub(user,pilot,task,session);hubs.set(user.id,h);created=true}
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();res.socket?.setNoDelay(true);let closed=false;
 const viewer={valid:sessionValid,send(event,value){if(!closed&&!res.writableEnded&&res.writableLength<131072)res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`)},stop(){if(closed)return;closed=true;h.viewers.delete(viewer);res.end();if(!h.viewers.size)h.close()}};
 h.viewers.add(viewer);res.on('close',viewer.stop);if(h.frame)viewer.send('frame',h.frame);if(created)try{await h.attach()}catch{h.close()}
}
