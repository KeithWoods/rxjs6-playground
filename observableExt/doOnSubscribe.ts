import { Observable } from 'rxjs';
import {log} from "./tempLogger";

export function doOnSubscribe<T>(action: () => void) : (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>) => new Observable<T>((subscriber) => {
        log(`before subscribe`);
        action();
        let subscription = source.subscribe(subscriber);
        return () => {
            log(`Unsubscribed`);
            subscription.unsubscribe();
        };
    });
}

// Compatibility layer:
export function doOnSubscribeCompat<T>(action: () => void): Observable<T> {
    return doOnSubscribe<T>(action)(this);
}
(Observable as any).prototype.doOnSubscribe = doOnSubscribeCompat;
declare module 'rxjs/internal/Observable' {
    interface Observable<T> {
        doOnSubscribe: typeof doOnSubscribeCompat;
    }
}