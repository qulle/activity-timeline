const download = function(filename: string, content: any) {
    const downloadTrigger = document.createElement('a');

    downloadTrigger.style.display = 'none';
    downloadTrigger.setAttribute('download', filename);

    const data = isImage(filename)
        ? content
        : `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;

    downloadTrigger.setAttribute('href', data);
    downloadTrigger.click();
}

const isImage = function(filename: string) {
    if(!filename.includes('.')) {
        return false;
    }

    return filename.split('.').pop()!.match(/jpg|jpeg|png|gif|svg/i) !== null;
}

export { download };
