import {WebSocketServer} from 'ws';
export function attachPilotControl(server,{accounts,pilot,origins}){
 const wss=new WebSocketServer({noServer:true,maxPayload:65536,perMessageDeflate:false});
 const queues=new Map();
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/api/pilot/control'){socket.destroy();return}
  const token=(req.headers.cookie||'').match(/(?:^|;\s*)__Host-axel=([a-f0-9]{64})(?:;|$)/)?.[1];
  const user=accounts.session(token);
  if(!origins.has(req.headers.origin)||!user||user.account_status!=='active'){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return}
  wss.handleUpgrade(req,socket,head,ws=>{
   let pending=0;ws.isAlive=true;ws.on('pong',()=>{ws.isAlive=true});
   ws.on('message',raw=>{
    let data;try{data=JSON.parse(raw.toString());if(data.action!=='input'||!Number.isSafeInteger(data.seq)||pending>=128)throw Error()}catch{ws.close(1008,'Invalid control message');return}
    const current=accounts.session(token);if(!current||current.id!==user.id||current.account_status!=='active'){ws.close(1008,'Session expired');return}
    pending++;const started=performance.now();
    const next=(queues.get(user.id)||Promise.resolve()).then(async()=>{
     try{if(ws.readyState!==1)throw Error('CONTROL_DISCONNECTED');const fresh=accounts.session(token);if(!fresh||fresh.id!==user.id||fresh.account_status!=='active')throw Error('SIGN_IN_REQUIRED');await pilot.command(fresh,data);if(ws.readyState===1)ws.send(JSON.stringify({seq:data.seq,ok:true,serverMs:Math.round(performance.now()-started)}))}
     catch(e){if(ws.readyState===1)ws.send(JSON.stringify({seq:data.seq,ok:false,code:/^[A-Z0-9_]+$/.test(e.message)?e.message:'CONTROL_FAILED'}))}
     finally{pending--}
    });queues.set(user.id,next);next.finally(()=>{if(queues.get(user.id)===next)queues.delete(user.id)});
   });
  });
 });
 const timer=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue}ws.isAlive=false;ws.ping()}},15000);timer.unref?.();
 const closeAll=server.closeAllConnections?.bind(server);if(closeAll)server.closeAllConnections=()=>{for(const ws of wss.clients)ws.terminate();closeAll()};
 server.on('close',()=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();wss.close()});
 return wss;
}
