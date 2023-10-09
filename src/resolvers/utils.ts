export function onlyIdRequested(info) {
    return onlyFieldsRequested(info, ['id']);
}

export function onlyFieldsRequested(info, fields: string[]) {
    const requestedFields = info.fieldNodes[0].selectionSet.selections
        .map(e => e.name.value);
    return requestedFields.every(field => fields.includes(field));
}