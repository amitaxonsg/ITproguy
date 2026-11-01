// Live frames go only to the authenticated customer, never to the model.
const clients=new Map();
export async function streamPilot(req,res,{user,pilot,sessionValid}){
 if(req.method!=='GET'){res.writeHead(405);return res.end()}
 if(!user||user.account_status!=='active'){res.writeHead(401);return res.end()}
 if(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site'])){res.writeHead(403);return res.end()}
 const task=pilot.tasks.get(user.id),session=pilot.browser.sessions.get(user.id);
 if(!task||!session){res.writeHead(409);return res.end()}
 clients.get(user.id)?.();
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();
 let cdp,page,closed=false,lastFrame=0,timer,changing=false;
 const send=(event,value)=>{if(!closed&&!res.writableEnded&&res.writableLength<400000)res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`)};
 const stop=()=>{if(closed)return;closed=true;clearInterval(timer);if(clients.get(user.id)===stop)clients.delete(user.id);cdp?.send('Page.stopScreencast').catch(()=>{});cdp?.detach().catch(()=>{});res.end()};
 clients.set(user.id,stop);res.on('close',stop);
 async function attach(){
  if(changing||closed)return;changing=true;
  try{await cdp?.send('Page.stopScreencast').catch(()=>{});await cdp?.detach().catch(()=>{});page=session.page;cdp=await session.context.newCDPSession(page);
   const current=cdp;current.on('Page.screencastFrame',frame=>{
    current.send('Page.screencastFrameAck',{sessionId:frame.sessionId}).catch(()=>{});
    if(Date.now()-lastFrame<80)return;lastFrame=Date.now();send('frame',{data:frame.data,width:1180,height:720});
   });
   await current.send('Page.startScreencast',{format:'jpeg',quality:65,maxWidth:1180,maxHeight:720,everyNthFrame:1});send('connected',{ok:true});
  }finally{changing=false}
 }
 timer=setInterval(()=>{
  if(!sessionValid()||pilot.tasks.get(user.id)!==task||pilot.browser.sessions.get(user.id)!==session)return stop();
  if(page!==session.page)attach().catch(stop);send('heartbeat',{at:Date.now()});
 },2000);timer.unref?.();
 try{await attach()}catch{stop()}
}
