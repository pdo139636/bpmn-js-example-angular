// diagram.component.ts

import {
  AfterContentInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  SimpleChanges,
  EventEmitter
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { map, switchMap } from 'rxjs/operators';
import { saveAs } from 'file-saver';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type { ImportDoneEvent, ImportXMLResult } from 'bpmn-js';

/**
 * You may include a different variant of BpmnModeler :
 *
 * bpmn-viewer  - displays BPMN diagrams without the ability
 *                to navigate them
 * bpmn-modeler - bootstraps a full-fledged BPMN editor
 */
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { from, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-diagram',
  templateUrl: './diagram.component.html',
  styles: [
    `
      .diagram-container {
        height: 100%;
        width: 100%;
      }
    `
  ]
})
export class DiagramComponent implements AfterContentInit, OnChanges, OnDestroy, OnInit {

  @ViewChild('ref', { static: true }) private el: ElementRef;
  @Input() private url?: string;
  @Output() private importDone: EventEmitter<ImportDoneEvent> = new EventEmitter();
  private modeler: BpmnModeler = new BpmnModeler();

  constructor(private http: HttpClient) {
    this.modeler.on<ImportDoneEvent>('import.done', ({ error }) => {
      if (!error) {
        this.modeler.get<Canvas>('canvas').zoom('fit-viewport');
      }
    });
  }

  ngAfterContentInit(): void {
    this.modeler.attachTo(this.el.nativeElement);
  }

  ngOnInit(): void {
    if (this.url) {
      this.loadUrl(this.url);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // re-import whenever the url changes
    if (changes.url) {
      this.loadUrl(changes.url.currentValue);
    }
  }

  ngOnDestroy(): void {
    this.modeler.destroy();
  }

  /**
   * Load diagram from URL and emit completion event
   */
  loadUrl(url: string): Subscription {

    return (
      this.http.get(url, { responseType: 'text' }).pipe(
        switchMap((xml: string) => this.importDiagram(xml)),
        map(result => result.warnings),
      ).subscribe(
        (warnings) => {
          this.importDone.emit({
            type: 'success',
            warnings
          });
        },
        (err) => {
          this.importDone.emit({
            type: 'error',
            error: err
          });
        }
      )
    );
  }

  /**
   * Creates a Promise to import the given XML into the current
   * BpmnModeler  instance, then returns it as an Observable.
   *
   * @see https://github.com/bpmn-io/bpmn-js-callbacks-to-promises#importxml
   */
  private importDiagram(xml: string): Observable<ImportXMLResult> {
    return from(this.modeler.importXML(xml));
  }

  private getXmlFromModeler(modeler) {
    console.log("getXmlFromModeler called");
    return new Promise((resolve, reject) => {
      modeler.saveXML(
        { format: true },
        (err, xml) => {
          if (err) {
            console.log("errror.")
            reject(err)
          } else {
            console.log("resolve error.")
            resolve(xml)
          }
        }
      )
    })
  }

  onSaveDiagram() {
    console.log("onSaveDiagram called");
    /* // Call getXmlFromModeler to get the diagram XML
    this.getXmlFromModeler(this.modeler)
      .then(xml => {
        // Convert the XML content to a Blob
        const blob = new Blob([String(xml)], { type: 'application/xml' });
        // Save the Blob as a file using FileSaver.js
        saveAs(blob, 'updated_diagram.xml');
        console.log("save completes.")
      })
      .catch(error => {
        // Handle errors if any
        console.log("Error saving diagram:", error);
      }); */
    this.exportDiagramToConsole();
    this.exportDiagramToFile();
  }

  private async exportDiagramToConsole() {
    try {
      var result = await this.modeler.saveXML({ format: true });
      alert('Diagram exported. Check the developer tools!');
      console.log('DIAGRAM', result.xml);
    } catch (err) {
      console.error('could not save BPMN 2.0 diagram', err);
    }
  }

  private async exportDiagramToFile() {
    try {
      var result = await this.modeler.saveXML({ format: true });
      // Convert the XML content to a Blob
      const blob = new Blob([String(result.xml)], { type: 'application/xml' });
      // Save the Blob as a file using FileSaver.js
      saveAs(blob, 'updated_diagram.bpmn');
      console.log("save completes.")
      alert('Diagram saved to file!');
    } catch (err) {
      console.error('could not save BPMN 2.0 diagram', err);
    }
  }

}
