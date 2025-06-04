
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Maximize2, Download } from "lucide-react";

interface MoleculeViewer3DProps {
  smiles?: string;
  pdbData?: string;
  width?: number;
  height?: number;
  title?: string;
}

const MoleculeViewer3D: React.FC<MoleculeViewer3DProps> = ({ 
  smiles, 
  pdbData, 
  width = 300, 
  height = 250,
  title = "3D Structure"
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<any>(null);

  useEffect(() => {
    if (!smiles && !pdbData) return;

    const load3DMol = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load 3Dmol.js from CDN
        if (!(window as any).$3Dmol) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/1.8.0/3Dmol-min.js';
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        const $3Dmol = (window as any).$3Dmol;
        
        if (viewerRef.current) {
          // Clear previous viewer
          viewerRef.current.innerHTML = '';
          
          // Create new viewer
          const newViewer = $3Dmol.createViewer(viewerRef.current, {
            defaultcolors: $3Dmol.rasmolElementColors
          });

          if (pdbData) {
            // Load PDB data directly
            newViewer.addModel(pdbData, 'pdb');
          } else if (smiles) {
            // For SMILES, we need to generate 3D coordinates
            // This is a simplified approach - in production, you'd use RDKit or similar
            const mockPdbData = await generateMock3DFromSMILES(smiles);
            newViewer.addModel(mockPdbData, 'pdb');
          }

          // Set visualization style
          newViewer.setStyle({}, {
            stick: { radius: 0.15 },
            sphere: { scale: 0.3 }
          });

          // Add labels for heteroatoms
          newViewer.addPropertyLabels('atom', {}, {
            fontColor: 'black',
            fontSize: 12,
            showBackground: true,
            backgroundColor: 'white'
          });

          // Zoom to fit
          newViewer.zoomTo();
          
          // Render
          newViewer.render();
          
          setViewer(newViewer);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('3Dmol error:', err);
        setError('Failed to load 3D visualization');
        setIsLoading(false);
      }
    };

    load3DMol();
  }, [smiles, pdbData]);

  // Mock function to generate simple 3D coordinates from SMILES
  const generateMock3DFromSMILES = async (smilesString: string): Promise<string> => {
    // This is a very basic mock - in production, integrate with RDKit's 3D generation
    const atomCount = Math.min(smilesString.length, 20);
    let pdbContent = '';
    
    for (let i = 0; i < atomCount; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 10;
      const element = i % 3 === 0 ? 'C' : i % 7 === 0 ? 'N' : i % 11 === 0 ? 'O' : 'C';
      
      pdbContent += `ATOM  ${(i + 1).toString().padStart(5)} ${element.padEnd(4)} MOL A   1    ${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           ${element}\n`;
    }
    
    return pdbContent;
  };

  const resetView = () => {
    if (viewer) {
      viewer.zoomTo();
      viewer.render();
    }
  };

  const downloadPNG = () => {
    if (viewer) {
      viewer.pngURI((uri: string) => {
        const link = document.createElement('a');
        link.download = 'molecule_3d.png';
        link.href = uri;
        link.click();
      }, 800, 600);
    }
  };

  return (
    <Card className="border border-indigo-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-indigo-800">{title}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetView} disabled={isLoading || !!error}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadPNG} disabled={isLoading || !!error}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div 
            ref={viewerRef}
            className="border rounded bg-white"
            style={{ width: '100%', height: `${height}px` }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-sm text-gray-500">Loading 3D viewer...</div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded">
              <div className="text-xs text-red-600 text-center p-4">
                {error}
                <br />
                <small>Fallback to basic visualization</small>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-2 flex gap-2 text-xs">
          <Badge variant="outline">Interactive</Badge>
          <Badge variant="outline">Drag to rotate</Badge>
          <Badge variant="outline">Scroll to zoom</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default MoleculeViewer3D;
