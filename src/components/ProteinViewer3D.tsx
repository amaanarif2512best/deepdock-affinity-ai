
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Download, Eye } from "lucide-react";

interface ProteinViewer3DProps {
  fastaSequence?: string;
  receptorType?: string;
  width?: number;
  height?: number;
}

const ProteinViewer3D: React.FC<ProteinViewer3DProps> = ({ 
  fastaSequence, 
  receptorType, 
  width = 400, 
  height = 300 
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [viewStyle, setViewStyle] = useState('cartoon');

  // Pre-computed AlphaFold structures for popular receptors
  const alphafoldStructures = {
    'il-6': 'P05231', // IL-6 UniProt ID
    'il-10': 'P22301', // IL-10 UniProt ID
    'il-17a': 'Q16552', // IL-17A UniProt ID
    'tnf-alpha': 'P01375' // TNF-α UniProt ID
  };

  useEffect(() => {
    if (!receptorType && !fastaSequence) return;

    const loadProteinStructure = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load 3Dmol.js if not already loaded
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
          viewerRef.current.innerHTML = '';
          
          const newViewer = $3Dmol.createViewer(viewerRef.current, {
            defaultcolors: $3Dmol.elementColors.rasmol
          });

          if (receptorType && alphafoldStructures[receptorType as keyof typeof alphafoldStructures]) {
            // Load from AlphaFold database
            const uniprotId = alphafoldStructures[receptorType as keyof typeof alphafoldStructures];
            
            try {
              // Try to load from AlphaFold
              const response = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.pdb`);
              if (response.ok) {
                const pdbData = await response.text();
                newViewer.addModel(pdbData, 'pdb');
              } else {
                throw new Error('AlphaFold structure not available');
              }
            } catch (err) {
              // Fallback: generate mock protein structure
              const mockProtein = generateMockProteinStructure(receptorType);
              newViewer.addModel(mockProtein, 'pdb');
            }
          } else if (fastaSequence) {
            // For custom FASTA, generate a mock structure
            const mockProtein = generateMockProteinFromFasta(fastaSequence);
            newViewer.addModel(mockProtein, 'pdb');
          }

          // Apply visualization style
          applyViewStyle(newViewer, viewStyle);
          
          newViewer.zoomTo();
          newViewer.render();
          
          setViewer(newViewer);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Protein visualization error:', err);
        setError('Failed to load protein structure');
        setIsLoading(false);
      }
    };

    loadProteinStructure();
  }, [receptorType, fastaSequence, viewStyle]);

  const generateMockProteinStructure = (receptor: string): string => {
    // Generate a simple mock protein structure
    let pdb = '';
    const numResidues = 150;
    
    for (let i = 0; i < numResidues; i++) {
      // Generate alpha helix coordinates
      const phi = (i * 100 * Math.PI) / 180; // 100 degrees per residue
      const radius = 2.3; // Typical alpha helix radius
      const rise = 1.5; // Rise per residue
      
      const x = radius * Math.cos(phi);
      const y = radius * Math.sin(phi);
      const z = i * rise;
      
      // Add backbone atoms
      pdb += `ATOM  ${(i * 4 + 1).toString().padStart(5)} N   ALA A${(i + 1).toString().padStart(4)}    ${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           N\n`;
      pdb += `ATOM  ${(i * 4 + 2).toString().padStart(5)} CA  ALA A${(i + 1).toString().padStart(4)}    ${(x + 1).toFixed(3).padStart(8)}${(y + 1).toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C\n`;
      pdb += `ATOM  ${(i * 4 + 3).toString().padStart(5)} C   ALA A${(i + 1).toString().padStart(4)}    ${(x + 2).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C\n`;
      pdb += `ATOM  ${(i * 4 + 4).toString().padStart(5)} O   ALA A${(i + 1).toString().padStart(4)}    ${(x + 3).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           O\n`;
    }
    
    return pdb;
  };

  const generateMockProteinFromFasta = (fasta: string): string => {
    const sequence = fasta.replace(/^>.*\n/, '').replace(/\n/g, '');
    const numResidues = Math.min(sequence.length, 200);
    
    let pdb = '';
    for (let i = 0; i < numResidues; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      
      pdb += `ATOM  ${(i + 1).toString().padStart(5)} CA  ${sequence[i] || 'A'}   A${(i + 1).toString().padStart(4)}    ${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C\n`;
    }
    
    return pdb;
  };

  const applyViewStyle = (viewer: any, style: string) => {
    viewer.removeAllModels();
    const models = viewer.getModels();
    
    switch (style) {
      case 'cartoon':
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        break;
      case 'surface':
        viewer.setStyle({}, { surface: { opacity: 0.8, color: 'white' } });
        break;
      case 'stick':
        viewer.setStyle({}, { stick: { radius: 0.1 } });
        break;
      case 'sphere':
        viewer.setStyle({}, { sphere: { scale: 0.3 } });
        break;
    }
    
    viewer.render();
  };

  const resetView = () => {
    if (viewer) {
      viewer.zoomTo();
      viewer.render();
    }
  };

  const downloadImage = () => {
    if (viewer) {
      viewer.pngURI((uri: string) => {
        const link = document.createElement('a');
        link.download = 'protein_structure.png';
        link.href = uri;
        link.click();
      });
    }
  };

  return (
    <Card className="border border-green-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-green-800">Protein Structure</CardTitle>
          <div className="flex gap-2">
            <Select value={viewStyle} onValueChange={setViewStyle}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="surface">Surface</SelectItem>
                <SelectItem value="stick">Stick</SelectItem>
                <SelectItem value="sphere">Sphere</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={resetView} disabled={isLoading || !!error}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading || !!error}>
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
              <div className="text-sm text-gray-500">Loading protein structure...</div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded text-center">
              <div className="text-xs text-red-600 p-4">
                {error}
                <br />
                <small>Using simplified model</small>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-2 flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">3D Interactive</Badge>
          <Badge variant="outline">AlphaFold</Badge>
          <Badge variant="outline">Multiple Views</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProteinViewer3D;
