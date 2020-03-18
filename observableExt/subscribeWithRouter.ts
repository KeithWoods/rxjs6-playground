import {Observable} from 'rxjs';
import {Router} from 'esp-js';
import {Guard} from 'esp-js';
import {materialize} from 'rxjs/operators';
import {Subscription} from 'rxjs';
import {PartialObserver} from 'rxjs';

export class EspRouterObservable<T, TModel> extends Observable<T> {
    constructor(private _router: Router, private _modelId: string, private _source: Observable<T>) {
        super();
    }

    // override the underlying subscribe
    subscribe(observerOrNext?: PartialObserver<T> | ((value: T) => void),
              error?: (error: any) => void,
              complete?: () => void): Subscription {
        throw new Error(`Invalid usage, use subscribeWithRouter, not subscribe `);
    }

    subscribeWithRouter(
        next?: (value: T, model: TModel) => void,
        error?: (exception: any, model: TModel) => void,
        complete?: (model: TModel) => void
    ): Subscription {
        return this._source.pipe(materialize()).subscribe(i => {
            switch (i.kind) {
                case 'N':
                    if (next !== null && next !== undefined) {
                        this._router.runAction<TModel>(this._modelId, model => next(i.value, model));
                    }
                    break;
                case 'E':
                    if (error === null || error === undefined) {
                        throw i.error;
                    } else {
                        this._router.runAction<TModel>(this._modelId, model => error(i.error, model));
                    }
                    break;
                case 'C':
                    if (complete !== null && complete !== undefined) {
                        this._router.runAction<TModel>(this._modelId, model => complete(model));
                    }
                    break;
                default:
                    throw new Error(`Unknown Notification Type. Type was ${i.kind}`);
            }
        });
    }
}

/**
 * Helper method to ease integration between Rx and Esp.
 *
 * When receiving results from an async operation (for example when results yield on an rx stream) you need to notify the esp router that a state change is about to occur for a given model.
 * There are a few ways to do this:
 * 1) publish an esp event in your rx subscription handler, handle the esp event as normal (the publish will have kicked off the the routers dispatch loop).
 * 2) call router.runAction() in your subscription handler and deal with the results inline, again this kicks off the the routers dispatch loop.
 * 3) use subscribeWithRouter which effectively wraps up method 2 for for all functions of subscribe (onNext, onError, onCompleted).
 *
 * @param router
 * @param modelId : the model id you want to update
 * @param next
 * @param error
 * @param complete
 */
export function liftToEspObservable<T, TModel>(
    router: Router,
    modelId: string
) : (source: Observable<T>) => EspRouterObservable<T, TModel> {
    Guard.isDefined(router, 'router should be defined');
    Guard.isString(modelId, 'modelId should be defined and a string');
    return (source: Observable<T>) => new EspRouterObservable<T, TModel>(router, modelId, source);
}

// Compatibility layer:
(Observable as any).prototype.subscribeWithRouter = liftToEspObservable;
declare module 'rxjs/internal/Observable' {
    interface Observable<T> {
        liftToEspObservable: typeof liftToEspObservable;
    }
}

//
// Rx.Observable.prototype.subscribeWithRouter = function <T, TModel>(
//     router: Router,
//     modelId: string,
//     next?: (value: T, model: TModel) => void,
//     error?: (exception: any, model: TModel) => void,
//     complete?: (model: TModel) => void
// ): Rx.Subscription {
//
//     Guard.isDefined(router, 'router should be defined');
//     Guard.isString(modelId, 'modelId should be defined and a string');
//     let source = this;
//
//     return source.materialize().subscribe(i => {
//         switch (i.kind) {
//             case 'N':
//                 if (next !== null && next !== undefined) {
//                     router.runAction<TModel>(modelId, model => next(i.value, model));
//                 }
//                 break;
//             case 'E':
//                 if (error === null || error === undefined) {
//                     throw i.error;
//                 } else {
//                     router.runAction<TModel>(modelId, model => error(i.error, model));
//                 }
//                 break;
//             case 'C':
//                 if (complete !== null && complete !== undefined) {
//                     router.runAction<TModel>(modelId, model => complete(model));
//                 }
//                 break;
//             default:
//                 throw new Error(`Unknown Notification Type. Type was ${i.kind}`);
//         }
//     });
// };
