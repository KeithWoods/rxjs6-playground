import {pipe, Observable, of} from 'rxjs';

// pipe(
//     of(1, 2, 3),
// )

export function doOnSubscribe<T>(action: () => void) : (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>) => new Observable<T>((subscriber) => {
        action();
        let subscription = source.subscribe(subscriber);
        return () => {
            console.log(`Unsubscribing`);
            subscription.unsubscribe();
        };
    });
}

of(1, 2, 3)
    .pipe(
        doOnSubscribe(() => { console.log(`Hello`);})
    )
    .subscribe(
        x => {
            console.log(x);
        }
    );

