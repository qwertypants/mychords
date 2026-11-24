import { expect,test } from 'vitest';
import { planStrums,nearestSample } from './guitar';
import { findVoicings } from '../chords/catalog';
const c=findVoicings({root:'C',suffix:'major'}).find(v=>v.frets.join(',')==='-1,3,2,0,1,0');
if(!c)throw new Error('Missing fixture');
test('strums exact sounding strings at simple fixed preview spacing',()=>{
 const events=planStrums([{entryId:'one',voicing:c},{entryId:'two',voicing:c}]);
 expect(events.slice(0,5).map(e=>e.midi)).toEqual([48,52,55,60,64]);
 expect(events.slice(0,5).map(e=>e.at)).toEqual([0,.025,.05,.07500000000000001,.1]);
 expect(events[5].at).toBe(1.8);expect(events[5].entryId).toBe('two');
 expect(planStrums([])).toEqual([]);
});
test('nearest sample is selected without rounding away semitones',()=>{
 expect(nearestSample(48,[40,45,50,55])).toBe(50);
 expect(nearestSample(42,[40,44])).toBe(40);
});
