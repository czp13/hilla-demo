import "@vaadin/text-field";
import "@vaadin/button";
import "@vaadin/grid";
import "@vaadin/grid/vaadin-grid-column";
import { html } from 'lit';
import { customElement, query } from 'lit/decorators.js';
import { View } from '../../views/view';
import './contact-form';
import { listViewStore } from './list-view-store';
import "@vaadin/notification";
import { uiStore } from "Frontend/stores/app-store";
import { ContactForm } from "./contact-form";
import { Grid, GridDataProviderCallback, GridDataProviderParams } from "@vaadin/grid";
import Contact from "Frontend/generated/com/example/application/data/entity/Contact";
import { RouterLocation } from "@vaadin/router";

@customElement('list-view')
export class ListView extends View {

  // Use query decorator to set grid for later use
  @query("#grid")
  grid! : Grid<Contact>;

  // Process the url parameters
  onBeforeEnter(location: RouterLocation) { 
    if (location.params.company) {
      listViewStore.company = location.params.company as string;
    }
    if (location.params.status) {
      listViewStore.status = location.params.status as string;
    }
  }

  // Notable points
  // - Filter field is disabled in offline mode as we can't fetch data from backend
  // - Grid is setup using dataprovider for lazy loading of the data from server and database
  // - contact-form has data-change event hooked to function
  // - Icons set to vaadin-text-field and vaadin-button
  render() {
    return html`
      <div class="m-m toolbar gap-s">
        <vaadin-text-field
          id="email"
          placeholder="Filter by e-mail"
          .value=${listViewStore.filterText}
          @input=${this.updateFilter}
          clear-button-visible
          .disabled=${uiStore.offline}
        >
         <vaadin-icon slot="prefix" icon="vaadin:search"></vaadin-icon>
        </vaadin-text-field>
        <vaadin-button
          .disabled=${uiStore.offline}
          @click=${listViewStore.editNew}>
          <vaadin-icon slot="suffix" icon="vaadin:plus"></vaadin-icon>
          Add Contact
        </vaadin-button>
      </div>
      <div class="flex se-m w-full h-full">
        <vaadin-grid 
          id="grid"
          theme="no-border no-row-borders row-stripes"
          class="m-m p-s shadow-m grid h-full"
          .dataProvider=${this.dataProvider} 
          .selectedItems=${[listViewStore.selectedContact]}
          @active-item-changed=${this.handleGridSelection}
             >
          <vaadin-grid-column path="firstName" auto-width>
            </vaadin-grid-column>
          <vaadin-grid-column path="lastName" auto-width>
            </vaadin-grid-column>
          <vaadin-grid-column path="email" auto-width>
            </vaadin-grid-column>
          <vaadin-grid-column
            path="status.name"
            header="Status"
            auto-width
          ></vaadin-grid-column>
          <vaadin-grid-column
            path="company.name"
            auto-width
            header="Company"
          ></vaadin-grid-column>
        </vaadin-grid>
        <contact-form 
          @data-change=${this.handleDataChange}
          class="overflow-auto m-m p-s shadow-m flex flex-col" 
          ?hidden=${!listViewStore.selectedContact}>
        </contact-form>
      </div>
      <vaadin-notification
        theme=${uiStore.message.error ? "error" : "contrast"}
        position="middle"
        .opened=${uiStore.message.open}
        .renderer=${(root: HTMLElement) =>
        (root.textContent = uiStore.message.text)}
      ></vaadin-notification>
    `;
  }

  // requestUpdate is function from Lit to trigger re-rending of the component
  // we set grid.dataProvider to null in order to invalidate it so that data is fully refreshed
  private handleDataChange() {
    this.grid.dataProvider=null;
    this.requestUpdate();
  }

  // This is callback of the dataprovider, Grid requests a new page of data when user
  // is scrolling up/down beyond data buffer, this gives illusion of infinite scrolling
  async dataProvider(params: GridDataProviderParams<Contact>, callback: GridDataProviderCallback<Contact>) {
    const page = await listViewStore.fetchPage(params.page, params.pageSize);
    if (page) {
      callback(page.content, page.size);
    }
  }

  // vaadin-grid fires a null-event when initialized,
  // we are not interested in it.
  first = true;
  handleGridSelection(e: CustomEvent) {
    if (this.first) {
      this.first = false;
      return;
    }
    // Find the contact form
    const form = this.getElementsByTagName("contact-form")[0] as ContactForm;
    // Do not allow selection if binder has changes
    if (form && form.binder.dirty) {
      return;
    }
    listViewStore.setSelectedContact(e.detail.value);
  }

  connectedCallback() {
    super.connectedCallback();
    this.classList.add(
      'flex',
      'flex-col',
      'p-m',
      'h-full'
    );
    this.autorun(() => {
      if (!uiStore.offline) {
        // uiStore will check user authorites from the server and cache them
        uiStore.getAuthorities();
      }
      if (listViewStore.selectedContact) {
        this.classList.add("editing");
      } else {
        this.classList.remove("editing");
      }
    });

  }

  // If user enters text to email filter, we reset other filters
  // dataprovider needs to be invalidated to fetch new data
  updateFilter(e: { target: HTMLInputElement }) {
    listViewStore.updateFilter(e.target.value);
    listViewStore.company=null;
    listViewStore.status=null;
    this.handleDataChange();
  }

}
