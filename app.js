class DataStorage {
  url = 'https://markdelokotestjs.herokuapp.com/people';
  pageNumber = Number(localStorage.getItem('pageNumber')) || 0;
  itemsPerPage = 30;

  async getInitialData() {
    const savedData = localStorage.getItem('data');
    return savedData ? JSON.parse(savedData) : this.nextPage()
  }

  async nextPage(){
    try {
      let response = await fetch(`${this.url}?limit=${this.itemsPerPage}&offset=${this.pageNumber * this.itemsPerPage}`)
      if (response.ok) {
        const savedData = JSON.parse(localStorage.getItem('data')) || [];
        const json = await response.json();
        this.pageNumber += 1;
        localStorage.setItem('data', JSON.stringify(savedData.concat(json)));
        localStorage.setItem('pageNumber', this.pageNumber.toString());
        return json;
      } else {
        alert("Ошибка HTTP: " + response.status);
      }
    } catch (e) {
      alert("Ошибка HTTP: " + e);
    }
  }
}


class ViewController {
  dataStorage = new DataStorage();
  container = document.querySelector('#container');
  _data = []
  _headers = [];
  _isLoading = false;

  constructor() {
    this.createLayout();

    this.getDataButton.addEventListener('click', this.getData.bind(this));
    this.clearButton.addEventListener('click', this.clearData.bind(this));
  }

  createLayout() {
    const splashElement = document.createElement('div');
    splashElement.classList.add('splash');
    const infoContainer = document.createElement('div');
    splashElement.appendChild(infoContainer);

    const splashElementText = document.createElement('div');
    splashElementText.classList.add('splash-text');
    splashElementText.innerText = 'Загрузите данные';
    const getDataButtonElement = document.createElement('button');
    getDataButtonElement.innerText = 'Get data';
    getDataButtonElement.classList.add('get-data-button')

    infoContainer.appendChild(splashElementText);
    infoContainer.appendChild(getDataButtonElement);
    this.container.appendChild(splashElement);


    const tableContainerElement = document.createElement('div');
    tableContainerElement.classList.add('table-container');
    tableContainerElement.style.display = 'none';
    const tableElement = document.createElement('table');
    const tableHeader = document.createElement('thead');
    const tableHeaderRow = document.createElement('tr');
    const tableBody = document.createElement('tbody');
    tableHeader.appendChild(tableHeaderRow);
    tableElement.appendChild(tableHeader);
    tableElement.appendChild(tableBody);

    this.container.appendChild(tableContainerElement);

    const clearDataButtonElement = document.createElement('button');
    clearDataButtonElement.innerText = 'Clear';
    clearDataButtonElement.classList.add('clear-button')
    tableContainerElement.appendChild(clearDataButtonElement);
    tableContainerElement.appendChild(tableElement);

    this.getDataButton = getDataButtonElement;
    this.clearButton = clearDataButtonElement;
    this.tableBody = tableBody;
    this.tableElement = tableElement;
    this.tableHeaderRow = tableHeaderRow;
    this.splashElement = splashElement;
    this.tableContainerElement = tableContainerElement;
    this.loader = document.createElement('div');
    this.loader.classList.add('loader');
    this.loader.innerText = 'Loading data...';

    this.tableContainerElement.appendChild(this.loader);
  }


  setSortField(field) {
    if (field === this.sortField) {
      if (this.sortDirection === 'ASC') {
        this.sortDirection = 'DESC';
      } else {
        this.sortField = null;
        this.sortDirection = null;
      }
    } else {
      this.sortField = field;
      this.sortDirection = 'ASC';
    }

    this.renderData();
    this.renderHeader();
  }

  createHeaderTitleElement(text) {
    const headerElement = document.createElement('th');
    const isSortField = this.sortField === text;
    const sortingArrow = this.sortDirection === 'ASC' ? '↑' : '↓';
    headerElement.innerText = `${text} ${isSortField ? sortingArrow : ''}`;
    headerElement.addEventListener('click', () => this.setSortField(text), {once: true})
    return headerElement
  }

  createRegularDataElement(text) {
    const cellElement = document.createElement('td');
    cellElement.innerText = text;

    return cellElement;
  }

  createRemoveElement(id) {
    const removeButtonCell = document.createElement('td');
    const removeButton = document.createElement('span');
    removeButton.innerText = '❌';
    removeButtonCell.appendChild(removeButton);

    removeButton.addEventListener('click', () => {
      this.data = this._data.filter((_, index) => index !== id);
    })

    return removeButtonCell;
  }

  addDataRow(item, index) {
    const rowElement = document.createElement('tr');
    this._headers
      .map((header) => this.createRegularDataElement(item[header]))
      .forEach((el) => rowElement.appendChild(el));
    rowElement.appendChild(this.createRemoveElement(index));
    this.tableBody.appendChild(rowElement);
  }

  renderHeader() {
    this._headers = Object.keys(this._data[0] || {});

    if (!this._headers.length) {
      return;
    }

    [...this.tableHeaderRow.children].forEach((child) => child.remove());

    [...this._headers, 'Действия']
      .map(this.createHeaderTitleElement.bind(this))
      .forEach((el) => this.tableHeaderRow.appendChild(el));
  }

  renderData() {
    [...this.tableBody.children].forEach((child) => child.remove());
    if (this.sortField) {
      const sortedData = [...this._data].sort((a, b) => this.sortDirection === 'ASC'
        ? `${a[this.sortField]}`.localeCompare(`${b[this.sortField]}`)
        : `${b[this.sortField]}`.localeCompare(`${a[this.sortField]}`)
      )
      sortedData.map(this.addDataRow.bind(this));
      return;
    }
    this._data.map(this.addDataRow.bind(this));
  }

  handleLoaderIntersect(entries) {
    if (entries.some((entry) => entry.isIntersecting)) {
      this.getNextData();
    }
  }

  async getData() {
    try {
      this.isLoading = true;
      const data = await this.dataStorage.getInitialData();
      this.data = this._data.concat(data);
      this.isLoading = false;
      const observer = new IntersectionObserver(this.handleLoaderIntersect.bind(this),
        {
          root: null,
          rootMargin: '0px',
          threshold: 0.25
        });
      observer.observe(this.loader);
    } catch (e) {
      console.log(e);
      alert("Ошибка HTTP: " + e)
    }
  }

  async getNextData() {
    if (this._isLoading) {
      return;
    }
    this.isLoading = true;
    const data = await this.dataStorage.nextPage();
    this.data = this._data.concat(data);
    this.isLoading = false;
  }

  clearData() {
    this.data = [];
    localStorage.clear();
  }

  set data(newData) {
    this._data = newData
    this.renderHeader();
    this.renderData();
    if (newData.length || this._isLoading) {
      this.tableContainerElement.style.display = 'flex';
      this.splashElement.style.display = 'none';
    } else {
      this.tableContainerElement.style.display = 'none';
      this.splashElement.style.display = 'flex';
    }

  }
}

const setup = () => {
  const viewController = new ViewController();
}

document.addEventListener('DOMContentLoaded', setup);

