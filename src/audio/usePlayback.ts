import { useEffect,useRef,useState } from 'react';
import { createGuitarPlayer } from './guitar';
import type { PreviewItem,GuitarPlayer,PlaybackState } from './guitar';
export function usePlayback() {
 const player=useRef<GuitarPlayer|null>(null);
 const [state,setState]=useState<PlaybackState>({status:'idle',activeEntryId:null,message:null});
 useEffect(()=>{const hidden=()=>{if(document.hidden)player.current?.stop();};document.addEventListener('visibilitychange',hidden);return ()=>{document.removeEventListener('visibilitychange',hidden);player.current?.dispose();player.current=null;};},[]);
 return {state,play:(items:readonly PreviewItem[])=>{player.current??=createGuitarPlayer();void player.current.play(items,setState);},stop:()=>player.current?.stop()};
}
