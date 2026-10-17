import pg from 'pg';
export function database(url,max=10){
  const pool=new pg.Pool({connectionString:url,max,idleTimeoutMillis:30000,connectionTimeoutMillis:3000,
    statement_timeout:5000,query_timeout:7000,application_name:'it1140'});
  pool.on('error',()=>console.error('database_connection_error'));return pool;
}
