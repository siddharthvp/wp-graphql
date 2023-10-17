export class Title {
    namespace: number;
    name: string;
    constructor(namespace: number, name: string) {
        // Note: order of property names matter, due to Object.getOwnPropertyNames() usage!
        this.namespace = namespace;
        this.name = name.replace(/ /g, '_');
    }
}
