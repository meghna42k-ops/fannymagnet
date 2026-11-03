import type { APIRoute } from 'astro';
import { kleapSql, kleapSqlTransaction, kleapUser } from '@/lib/kleap-db-server';
export const prerender = false;
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export async function adminSession(request:Request){const token=/fm_admin_session=([^;]+)/.exec(request.headers.get('cookie')||'')?.[1];if(!token)return null;const {rows}=await kleapSql('SELECT a.user_id,a.role FROM fm_admin_sessions s JOIN fm_admins a ON a.user_id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.active=true',[await digest(token)]);return rows[0]||null;}
const access:Record<string,string[]>={products:['super_admin','product_manager'],content:['super_admin','content_manager'],settings:['super_admin','content_manager'],customers:['super_admin','support_manager'],orders:['super_admin','support_manager'],admins:['super_admin'],audit:['super_admin']};
const tables:Record<string,string>={products:'fm_products',content:'fm_content',settings:'fm_settings',orders:'fm_orders',admins:'fm_admins',audit:'fm_audit'};
const fields:Record<string,string[]>={products:['id','category','name','brand','price','size','ingredients','nutrition','serving','allergens','instructions','warnings','image_url','manufacturer_url','stock','verified','published'],content:['id','section','title','summary','body','source_url','source_label','publication_date','published'],settings:['id','value'],orders:['id','status','tracking_url'],admins:['user_id','role','active']};
export const ALL:APIRoute=async({request,cookies})=>{try{
const url=new URL(request.url);const action=url.searchParams.get('action')||'me';
if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return reply({error:'Invalid origin'},403);
const body=request.method==='POST'?await request.json():{};
if(action==='session'&&request.method==='POST'){const user=await kleapUser(request);if(!user)return reply({error:'Sign in first'},401);
if(body.setupToken)await kleapSql("WITH claim AS (UPDATE fm_admin_setup SET consumed=true WHERE id='initial' AND token_hash=$1 AND NOT consumed AND expires_at>now() AND NOT EXISTS(SELECT 1 FROM fm_admins) RETURNING id) INSERT INTO fm_admins(user_id,role,active) SELECT $2,'super_admin',true FROM claim",[await digest(String(body.setupToken)),user.id]);
const {rows}=await kleapSql('SELECT role FROM fm_admins WHERE user_id=$1 AND active=true',[user.id]);if(!rows[0])return reply({error:'Administrator permission required'},403);
if(body.master===true&&rows[0].role!=='super_admin')return reply({error:'Master access requires a super administrator account'},403);
const token=crypto.randomUUID()+crypto.randomUUID();await kleapSqlTransaction([{query:"INSERT INTO fm_admin_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",params:[await digest(token),user.id]},{query:"INSERT INTO fm_audit(actor,action,entity) VALUES($1,'login','administration')",params:[user.id]}]);cookies.set('fm_admin_session',token,{httpOnly:true,secure:url.protocol==='https:',sameSite:'strict',path:'/',maxAge:3600});return reply({role:rows[0].role});}
const admin=await adminSession(request);if(!admin)return reply({error:'Administrator login required'},401);
if(action==='logout'&&request.method==='POST'){await kleapSql('DELETE FROM fm_admin_sessions WHERE token_hash=$1',[await digest(cookies.get('fm_admin_session')?.value||'')]);cookies.delete('fm_admin_session',{path:'/'});return reply({ok:true});}
if(action==='me')return reply(admin);
const entity=url.searchParams.get('entity')||'';if(!access[entity]?.includes(admin.role))return reply({error:'Permission denied'},403);
if(request.method==='GET'){const query=entity==='customers'?'SELECT id,name,email FROM neon_auth."user" LIMIT 200':'SELECT * FROM '+tables[entity]+' LIMIT 200';const {rows}=await kleapSql(query);return reply({rows});}
if(!fields[entity])return reply({error:'Read only'},403);
const data=body.data;if(!data||typeof data!=='object'||Array.isArray(data))return reply({error:'Invalid record'},400);
const pk=entity==='admins'?'user_id':'id';const keys=Object.keys(data).filter(k=>fields[entity].includes(k));if(!data[pk]||keys.length<2)return reply({error:'Identifier and changes required'},400);
if(entity==='admins'){if(data.user_id===admin.user_id)return reply({error:'Cannot change your own permissions'},400);if(!['super_admin','content_manager','product_manager','marketing_manager','support_manager'].includes(data.role)||typeof data.active!=='boolean')return reply({error:'Invalid role'},400);const existing=await kleapSql('SELECT id FROM neon_auth."user" WHERE id::text=$1',[data.user_id]);if(!existing.rows.length)return reply({error:'Account does not exist'},400);}
if(entity==='settings'&&data.id!=='homepage')return reply({error:'This setting is not connected yet'},400);
if(entity==='products'){if(data.price!=null&&(!Number.isFinite(Number(data.price))||Number(data.price)<0))return reply({error:'Invalid price'},400);if(data.stock!=null&&(!Number.isInteger(Number(data.stock))||Number(data.stock)<0))return reply({error:'Invalid stock'},400);}
for(const key of ['image_url','manufacturer_url','source_url','tracking_url'])if(data[key]){const link=new URL(String(data[key]));if(link.protocol!=='https:')return reply({error:'HTTPS links required'},400);}
const values=keys.map(k=>entity==='settings'&&k==='value'?JSON.stringify(data[k]):data[k]);
const updates=keys.filter(k=>k!==pk);let query='';
if(entity==='orders')query='UPDATE fm_orders SET '+updates.map(k=>k+'=$'+(keys.indexOf(k)+1)).join(',')+' WHERE id=$'+(keys.indexOf(pk)+1)+' RETURNING id';
else query='INSERT INTO '+tables[entity]+' ('+keys.join(',')+') VALUES ('+keys.map((_,i)=>'$'+(i+1)).join(',')+') ON CONFLICT ('+pk+') DO UPDATE SET '+updates.map(k=>k+'=EXCLUDED.'+k).join(',')+' RETURNING '+pk;
await kleapSqlTransaction([{query,params:values},{query:"INSERT INTO fm_audit(actor,action,entity,record_id) VALUES($1,'save',$2,$3)",params:[admin.user_id,entity,String(data[pk])]}]);return reply({ok:true});
}catch{return reply({error:'Unable to complete request. Check your session and record.'},500);}};
