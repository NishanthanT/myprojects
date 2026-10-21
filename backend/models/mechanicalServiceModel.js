import {query} from '../config/db.js';
let ready;
export function ensureMechanicalTables(){
  if(!ready)ready=(async()=>{
    await query(`CREATE TABLE IF NOT EXISTS mechanical_service_types (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      type_name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await query(`CREATE TABLE IF NOT EXISTS mechanical_employees (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      mechanic_name VARCHAR(100) NOT NULL,
      address VARCHAR(255) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      type_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_mechanical_employee_type FOREIGN KEY (type_id) REFERENCES mechanical_service_types(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  })().catch(error=>{ready=undefined;throw error;});
  return ready;
}
export const MechanicalServiceModel={
  async directory(){
    await ensureMechanicalTables();
    const [types,mechanics]=await Promise.all([
      query('SELECT id,type_name FROM mechanical_service_types ORDER BY type_name,id'),
      query(`SELECT m.id,m.mechanic_name,m.address,m.phone,m.type_id,t.type_name
        FROM mechanical_employees m JOIN mechanical_service_types t ON t.id=m.type_id ORDER BY m.mechanic_name,m.id`)
    ]);
    return {types,mechanics};
  },
  async createType({type_name}){await ensureMechanicalTables();return query('INSERT INTO mechanical_service_types (type_name) VALUES (?)',[type_name]);},
  async updateType(id,{type_name}){await ensureMechanicalTables();return query('UPDATE mechanical_service_types SET type_name=? WHERE id=?',[type_name,id]);},
  async deleteType(id){await ensureMechanicalTables();return query('DELETE FROM mechanical_service_types WHERE id=?',[id]);},
  async createMechanic({mechanic_name,address,phone,type_id}){await ensureMechanicalTables();return query('INSERT INTO mechanical_employees (mechanic_name,address,phone,type_id) VALUES (?,?,?,?)',[mechanic_name,address,phone,type_id]);},
  async updateMechanic(id,{mechanic_name,address,phone,type_id}){await ensureMechanicalTables();return query('UPDATE mechanical_employees SET mechanic_name=?,address=?,phone=?,type_id=? WHERE id=?',[mechanic_name,address,phone,type_id,id]);},
  async deleteMechanic(id){await ensureMechanicalTables();return query('DELETE FROM mechanical_employees WHERE id=?',[id]);}
};
