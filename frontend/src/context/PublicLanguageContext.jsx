import React,{createContext,useContext,useEffect,useState} from 'react';
import {publicTranslate,publicLanguage} from '../utils/publicTranslations.mjs';
const Context=createContext({language:'en',setLanguage:()=>{},t:(text,values)=>publicTranslate('en',text,values),date:value=>new Date(value).toLocaleDateString('en-LK')});
export function PublicLanguageProvider({children}){
  const [language,setLanguageState]=useState(()=>{try{return publicLanguage(localStorage.getItem('stn_public_language'));}catch{return 'en';}});
  const setLanguage=value=>{
    const next=publicLanguage(value);
    try{localStorage.setItem('stn_public_language',next);}catch{}
    setLanguageState(next);
  };
  useEffect(()=>{
    const onStorage=event=>{if(event.key==='stn_public_language')setLanguageState(publicLanguage(event.newValue));};
    window.addEventListener('storage',onStorage);
    return ()=>window.removeEventListener('storage',onStorage);
  },[]);
  useEffect(()=>{try{localStorage.setItem('stn_public_language',language);}catch{}},[language]);
  useEffect(()=>{const old=document.documentElement.lang;return ()=>{document.documentElement.lang=old;};},[]);
  useEffect(()=>{document.documentElement.lang=language;},[language]);
  const t=(text,values)=>publicTranslate(language,text,values);
  const date=value=>new Date(value).toLocaleDateString(language==='si'?'si-LK':language==='ta'?'ta-LK':'en-LK');
  return <Context.Provider value={{language,setLanguage,t,date}}>{children}</Context.Provider>;
}
export const usePublicLanguage=()=>useContext(Context);
