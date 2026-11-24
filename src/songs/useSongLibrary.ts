import { useState,useEffect } from 'react';
import type { Library,Song } from './types';
import { readLibrary,writeLibrary,browserStorage } from './storage';
import { newSong,addSection } from './commands';
export function useSongLibrary() {
 const [initial,setInitial]=useState(()=>readLibrary(browserStorage));
 const [library,setLibrary]=useState<Library>(()=>initial.kind==='ok'?initial.library:{version:1,songs:[]});
 const [draft,setDraft]=useState<Song|null>(null);
 const [dirty,setDirty]=useState(false);
 const [storageError,setStorageError]=useState<string|null>(null);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function saveDraft():boolean {
  if(!draft||initial.kind==='error')return false;
  const next:Library={version:1,songs:library.songs.some(s=>s.id===draft.id)?library.songs.map(s=>s.id===draft.id?draft:s):[draft,...library.songs]};
  const saved=writeLibrary(browserStorage,next);
  if(!saved.ok){setStorageError(saved.message);return false;}
  setLibrary(next);setDirty(false);setStorageError(null);return true;
 }
 function retry(){const result=readLibrary(browserStorage);setInitial(result);if(result.kind==='ok'){setLibrary(result.library);setStorageError(null);}}
 function reset(){const empty:Library={version:1,songs:[]};const result=writeLibrary(browserStorage,empty);if(result.ok){setInitial({kind:'ok',library:empty});setLibrary(empty);}else setStorageError(result.message);}
 return {library,draft,dirty,storageError,initial,saveDraft,retry,reset,
  openSong:(song:Song)=>{setDraft(structuredClone(song));setDirty(false);setStorageError(null);},
  newDraft:()=>{setDraft(addSection(newSong('Untitled song'),'Verse'));setDirty(true);setStorageError(null);},
  closeDraft:()=>{setDraft(null);setDirty(false);setStorageError(null);},
  updateDraft:(song:Song)=>{setDraft(song);setDirty(true);setStorageError(null);},
 };
}
