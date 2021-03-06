import {BehaviorSubject} from "rxjs";

import IdentityDarc from "src/lib/darc/identity-darc";
import {Darc, IIdentity, Rule, Rules} from "src/lib/darc";
import {Argument, InstanceID, Proof} from "src/lib/byzcoin";
import {DarcInstance} from "src/lib/byzcoin/contracts";

import {Transaction} from "./transaction";

export class DarcsBS extends BehaviorSubject<DarcBS[]> {
    constructor(sbs: BehaviorSubject<DarcBS[]>) {
        super(sbs.getValue());
        sbs.subscribe(this);
    }
}

export class DarcBS extends BehaviorSubject<Darc> {
    public readonly inst: BehaviorSubject<Proof>;

    constructor(darc: BehaviorSubject<Darc>) {
        super(darc.getValue());
        darc.subscribe(this);
    }

    public evolve(tx: Transaction, updates: IDarcAttr, unrestricted = false): Darc {
        const newArgs = {...this.getValue().evolve(), ...updates};
        const newDarc = new Darc(newArgs);
        const cmd = unrestricted ? DarcInstance.commandEvolveUnrestricted : DarcInstance.commandEvolve;
        const args = [new Argument({
            name: DarcInstance.argumentDarc,
            value: Buffer.from(Darc.encode(newDarc).finish())
        })];
        tx.invoke(newDarc.getBaseID(), DarcInstance.contractID, cmd, args);
        return newDarc;
    }

    public setSignEvolve(tx: Transaction, idSign: IIdentity | InstanceID, idEvolve = idSign) {
        const rules = this.getValue().rules.clone();
        rules.setRule(Darc.ruleSign, toIId(idSign));
        if (idEvolve) {
            rules.setRule(DarcInstance.ruleEvolve, toIId(idEvolve));
        }
        this.evolve(tx, {rules});
    }

    public addSignEvolve(tx: Transaction, idSign: IIdentity | InstanceID, idEvolve = idSign) {
        const rules = this.getValue().rules.clone();
        rules.appendToRule(Darc.ruleSign, toIId(idSign), Rule.OR);
        if (idEvolve) {
            rules.appendToRule(DarcInstance.ruleEvolve, toIId(idEvolve), Rule.OR);
        }
        this.evolve(tx, {rules});
    }

    public rmSignEvolve(tx: Transaction, id: IIdentity | InstanceID) {
        const rules = this.getValue().rules.clone();
        rules.getRule(Darc.ruleSign).remove(toIId(id).toString());
        rules.getRule(DarcInstance.ruleEvolve).remove(toIId(id).toString());
        this.evolve(tx, {rules});
    }
}

function toIId(id: IIdentity | InstanceID): IIdentity {
    if (id instanceof Buffer) {
        return new IdentityDarc({id: id});
    }
    return id;
}

export interface IDarcAttr {
    description?: Buffer;
    rules?: Rules;
}
