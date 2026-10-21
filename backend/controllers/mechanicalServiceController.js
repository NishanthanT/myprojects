import {MechanicalServiceModel} from '../models/mechanicalServiceModel.js';
import {mechanicalId,mechanicalTypeInput,mechanicInput} from '../services/mechanicalValidation.js';

export function mechanicalHandler(action,model=MechanicalServiceModel){
  return async(req,res)=>{
    try{
      if(action==='directory')return res.json({success:true,...await model.directory()});
      const isType=action.endsWith('Type'),isCreate=action.startsWith('create'),isDelete=action.startsWith('delete');
      const id=isCreate?null:mechanicalId(req.params.id);
      const data=isDelete?undefined:(isType?mechanicalTypeInput(req.body):mechanicInput(req.body));
      const result=await model[action](...(isCreate?[data]:[id,data]));
      if(!isCreate&&!result.affectedRows)return res.status(404).json({success:false,message:'Record not found.'});
      return res.status(isCreate?201:200).json({success:true,...(isCreate?{id:result.insertId}:{})});
    }catch(error){
      if(error.code==='ER_DUP_ENTRY')return res.status(409).json({success:false,message:'This mechanical type already exists.'});
      if(error.code==='ER_ROW_IS_REFERENCED_2')return res.status(409).json({success:false,message:'This type is used by mechanics. Reassign or remove those mechanics before deleting the type.'});
      if(error.code==='ER_NO_REFERENCED_ROW_2')return res.status(400).json({success:false,message:'Select an existing mechanical type.'});
      if(error.status)return res.status(error.status).json({success:false,message:error.message});
      console.error('Mechanical service operation failed:',error.code||error.message);
      return res.status(500).json({success:false,message:'Could not load or save mechanical services. Please retry.'});
    }
  };
}
