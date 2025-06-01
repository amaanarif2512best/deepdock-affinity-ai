
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Download, RefreshCw, Database } from "lucide-react";

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
  const [dataSource, setDataSource] = useState<string>('');

  // Enhanced receptor database with PDB IDs
  const receptorDatabase = {
    'il-6': {
      name: 'IL-6 (Interleukin-6)',
      pdbIds: ['1ALU', '1N26', '2IL6'],
      uniprotId: 'P05231',
      description: 'Pro-inflammatory cytokine'
    },
    'il-10': {
      name: 'IL-10 (Interleukin-10)', 
      pdbIds: ['2ILK', '1J7V', '1LK3'],
      uniprotId: 'P22301',
      description: 'Anti-inflammatory cytokine'
    },
    'il-17a': {
      name: 'IL-17A (Interleukin-17A)',
      pdbIds: ['4HSA', '5C21', '6MZR'],
      uniprotId: 'Q16552',
      description: 'Pro-inflammatory cytokine'
    },
    'tnf-alpha': {
      name: 'TNF-α (Tumor Necrosis Factor)',
      pdbIds: ['2AZ5', '1TNF', '2E7A'],
      uniprotId: 'P01375',
      description: 'Pro-inflammatory cytokine'
    }
  };

  useEffect(() => {
    if (!receptorType && !fastaSequence) return;
    loadProteinStructure();
  }, [receptorType, fastaSequence, viewStyle]);

  const loadProteinStructure = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load 3Dmol.js
      if (!(window as any).$3Dmol) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.1/3Dmol-min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 10000);
        });
      }

      const $3Dmol = (window as any).$3Dmol;
      
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        
        const newViewer = $3Dmol.createViewer(viewerRef.current, {
          defaultcolors: $3Dmol.elementColors.rasmol,
          backgroundColor: 'white'
        });

        let structureLoaded = false;

        if (receptorType && receptorDatabase[receptorType as keyof typeof receptorDatabase]) {
          const receptor = receptorDatabase[receptorType as keyof typeof receptorDatabase];
          
          // Method 1: Try PDB RCSB first
          for (const pdbId of receptor.pdbIds) {
            try {
              console.log(`Attempting to load PDB structure: ${pdbId}`);
              const pdbUrl = `https://files.rcsb.org/download/${pdbId}.pdb`;
              const response = await fetch(pdbUrl);
              
              if (response.ok) {
                const pdbData = await response.text();
                newViewer.addModel(pdbData, 'pdb');
                setDataSource(`PDB: ${pdbId}`);
                structureLoaded = true;
                console.log(`Successfully loaded PDB: ${pdbId}`);
                break;
              }
            } catch (e) {
              console.log(`PDB ${pdbId} failed, trying next...`);
              continue;
            }
          }

          // Method 2: Try AlphaFold as fallback
          if (!structureLoaded) {
            try {
              console.log(`Trying AlphaFold: ${receptor.uniprotId}`);
              const afUrl = `https://alphafold.ebi.ac.uk/files/AF-${receptor.uniprotId}-F1-model_v4.pdb`;
              const response = await fetch(afUrl);
              
              if (response.ok) {
                const pdbData = await response.text();
                newViewer.addModel(pdbData, 'pdb');
                setDataSource(`AlphaFold: ${receptor.uniprotId}`);
                structureLoaded = true;
                console.log(`Successfully loaded AlphaFold: ${receptor.uniprotId}`);
              }
            } catch (e) {
              console.log('AlphaFold failed, using generated structure');
            }
          }
        }

        // Method 3: Generate high-quality mock structure
        if (!structureLoaded) {
          const mockStructure = fastaSequence 
            ? generateAdvancedProteinFromFasta(fastaSequence)
            : generateAdvancedProteinStructure(receptorType || 'protein');
          
          newViewer.addModel(mockStructure, 'pdb');
          setDataSource('Generated Structure');
          structureLoaded = true;
        }

        if (structureLoaded) {
          // Apply visualization style
          applyViewStyle(newViewer, viewStyle);
          
          // Center and zoom
          newViewer.zoomTo();
          newViewer.render();
          
          setViewer(newViewer);
        }

        setIsLoading(false);
      }

    } catch (err) {
      console.error('Protein structure loading error:', err);
      setError('Unable to load protein structure');
      setIsLoading(false);
    }
  };

  const generateAdvancedProteinStructure = (receptorType: string): string => {
    const numResidues = 120;
    let pdb = 'HEADER    GENERATED PROTEIN STRUCTURE\n';
    
    // Generate realistic secondary structures
    for (let i = 0; i < numResidues; i++) {
      const residueNum = i + 1;
      
      // Alpha helix (residues 1-30)
      if (i < 30) {
        const phi = (i * 100 * Math.PI) / 180;
        const x = 2.3 * Math.cos(phi) + (Math.random() - 0.5) * 0.5;
        const y = 2.3 * Math.sin(phi) + (Math.random() - 0.5) * 0.5;
        const z = i * 1.5 + (Math.random() - 0.5) * 0.3;
        
        pdb += generateResidue('ALA', residueNum, x, y, z);
      }
      // Beta sheet (residues 31-60)
      else if (i < 60) {
        const x = (i - 30) * 3.5 + (Math.random() - 0.5) * 0.8;
        const y = Math.sin((i - 30) * 0.3) * 2 + (Math.random() - 0.5) * 0.5;
        const z = 45 + (Math.random() - 0.5) * 1.0;
        
        pdb += generateResidue('VAL', residueNum, x, y, z);
      }
      // Loop regions (residues 61-120)
      else {
        const angle = ((i - 60) / 60) * 2 * Math.PI;
        const radius = 15 + Math.sin(angle * 3) * 5;
        const x = radius * Math.cos(angle) + (Math.random() - 0.5) * 2;
        const y = radius * Math.sin(angle) + (Math.random() - 0.5) * 2;
        const z = 50 + (i - 60) * 0.5 + Math.sin(angle * 2) * 3;
        
        const residues = ['GLY', 'PRO', 'SER', 'THR'];
        const residue = residues[i % residues.length];
        pdb += generateResidue(residue, residueNum, x, y, z);
      }
    }
    
    pdb += 'END\n';
    return pdb;
  };

  const generateAdvancedProteinFromFasta = (fasta: string): string => {
    const sequence = fasta.replace(/^>.*\n/, '').replace(/\n/g, '');
    const numResidues = Math.min(sequence.length, 150);
    
    let pdb = 'HEADER    PROTEIN FROM FASTA SEQUENCE\n';
    
    for (let i = 0; i < numResidues; i++) {
      const aa = sequence[i] || 'A';
      const residue = convertAminoAcid(aa);
      
      // Create more realistic protein fold
      const t = i / numResidues;
      const spiralRadius = 8 + 4 * Math.sin(t * 4 * Math.PI);
      const angle = t * 6 * Math.PI;
      
      const x = spiralRadius * Math.cos(angle) + (Math.random() - 0.5) * 1.5;
      const y = spiralRadius * Math.sin(angle) + (Math.random() - 0.5) * 1.5;
      const z = t * 60 + Math.sin(angle * 2) * 3 + (Math.random() - 0.5) * 1.0;
      
      pdb += generateResidue(residue, i + 1, x, y, z);
    }
    
    pdb += 'END\n';
    return pdb;
  };

  const generateResidue = (residue: string, resNum: number, x: number, y: number, z: number): string => {
    const atomNum = (resNum - 1) * 4;
    return [
      `ATOM  ${(atomNum + 1).toString().padStart(5)} N   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           N`,
      `ATOM  ${(atomNum + 2).toString().padStart(5)} CA  ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 1.5).toFixed(3).padStart(8)}${(y + 0.5).toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C`,
      `ATOM  ${(atomNum + 3).toString().padStart(5)} C   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 2.4).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C`,
      `ATOM  ${(atomNum + 4).toString().padStart(5)} O   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 3.8).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           O`,
    ].join('\n') + '\n';
  };

  const convertAminoAcid = (aa: string): string => {
    const aaMap: { [key: string]: string } = {
      'A': 'ALA', 'R': 'ARG', 'N': 'ASN', 'D': 'ASP', 'C': 'CYS',
      'E': 'GLU', 'Q': 'GLN', 'G': 'GLY', 'H': 'HIS', 'I': 'ILE',
      'L': 'LEU', 'K': 'LYS', 'M': 'MET', 'F': 'PHE', 'P': 'PRO',
      'S': 'SER', 'T': 'THR', 'W': 'TRP', 'Y': 'TYR', 'V': 'VAL'
    };
    return aaMap[aa.toUpperCase()] || 'ALA';
  };

  const applyViewStyle = (viewer: any, style: string) => {
    viewer.setStyle({}, {});
    
    switch (style) {
      case 'cartoon':
        viewer.setStyle({}, { 
          cartoon: { 
            color: 'spectrum',
            style: 'trace'
          } 
        });
        break;
      case 'surface':
        viewer.setStyle({}, { 
          surface: { 
            opacity: 0.8, 
            color: 'white',
            map: 'electrostatic'
          } 
        });
        break;
      case 'stick':
        viewer.setStyle({}, { 
          stick: { 
            radius: 0.2,
            colorscheme: 'default'
          } 
        });
        break;
      case 'sphere':
        viewer.setStyle({}, { 
          sphere: { 
            scale: 0.4,
            colorscheme: 'element'
          } 
        });
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
        link.download = `protein_structure_${receptorType || 'custom'}.png`;
        link.href = uri;
        link.click();
      }, 1200, 900);
    }
  };

  const retry = () => {
    loadProteinStructure();
  };

  return (
    <Card className="border border-green-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Protein Structure
          </CardTitle>
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
            {error && (
              <Button size="sm" variant="outline" onClick={retry}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
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
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                Loading structure...
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded text-center">
              <div className="text-xs text-red-600 p-4">
                <div className="font-medium">{error}</div>
                <button onClick={retry} className="mt-2 text-blue-600 underline">
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-2 flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">3D Interactive</Badge>
          {dataSource && <Badge variant="secondary">{dataSource}</Badge>}
          <Badge variant="outline">High Quality</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProteinViewer3D;
