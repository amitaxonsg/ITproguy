export async function readPilotResponse(response){
 const type=response.headers.get('content-type')||'';
 if(!type.includes('application/json')){const e=new Error('The pilot is reconnecting. It will refresh automatically.');e.status=response.status;throw e}
 let data;try{data=await response.json()}catch{const e=new Error('The pilot response was interrupted. It will reconnect automatically.');e.status=response.status;throw e}
 if(!response.ok){const e=new Error(data.error||'The pilot could not complete this request.');e.status=response.status;throw e}
 return data
}
